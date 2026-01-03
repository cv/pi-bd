/**
 * bd Session Guard Hook
 *
 * Ensures work is properly committed and pushed before ending a session.
 * Runs full preflight checks on session shutdown and provides /preflight command.
 */

import type { HookAPI, HookContext } from "@mariozechner/pi-coding-agent";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

async function runPreflightChecks(pi: HookAPI, ctx: HookContext): Promise<Check[]> {
  const checks: Check[] = [];

  // Check 1: Uncommitted changes
  const { stdout: statusOut, code: statusCode } = await pi.exec("git", ["status", "--porcelain"], {
    timeout: 5000,
  });

  if (statusCode !== 0) {
    checks.push({ name: "Git status", ok: false, detail: "Not a git repo or git error" });
  } else if (statusOut.trim()) {
    const files = statusOut.trim().split("\n").filter(Boolean);
    checks.push({ name: "Uncommitted changes", ok: false, detail: `${files.length} file(s)` });
  } else {
    checks.push({ name: "Uncommitted changes", ok: true, detail: "Clean" });
  }

  // Check 2: Unpushed commits
  const { stdout: cherryOut, code: cherryCode } = await pi.exec("git", ["cherry", "-v"], {
    timeout: 5000,
  });

  if (cherryCode !== 0) {
    // Might not have an upstream - check differently
    const { stdout: branchOut } = await pi.exec(
      "git",
      ["rev-list", "--count", "@{u}..HEAD"],
      { timeout: 5000 }
    );
    if (branchOut.trim() && parseInt(branchOut.trim()) > 0) {
      checks.push({ name: "Unpushed commits", ok: false, detail: `${branchOut.trim()} commit(s)` });
    } else {
      checks.push({ name: "Unpushed commits", ok: true, detail: "No upstream or up to date" });
    }
  } else if (cherryOut.trim()) {
    const count = cherryOut.trim().split("\n").filter(Boolean).length;
    checks.push({ name: "Unpushed commits", ok: false, detail: `${count} commit(s)` });
  } else {
    checks.push({ name: "Unpushed commits", ok: true, detail: "Up to date" });
  }

  // Check 3: bd sync status
  // Note: bd sync --status doesn't output "pending" - we check for actual differences
  // See: pi-bd-12o for tracking machine-readable status output
  const { stdout: syncOut, code: syncCode } = await pi.exec("bd", ["sync", "--status"], {
    timeout: 5000,
  });

  if (syncCode !== 0) {
    checks.push({ name: "bd sync", ok: false, detail: "Sync check failed" });
  } else if (syncOut) {
    // Parse the sync status output to detect pending changes
    // Look for the "not in sync branch:" section and check if it has commits listed
    const lines = syncOut.split("\n");
    let inNotInSyncSection = false;
    let hasUnmergedCommits = false;
    let hasFileDiffs = false;
    
    for (const line of lines) {
      if (line.includes("not in sync branch:")) {
        inNotInSyncSection = true;
        continue;
      }
      if (inNotInSyncSection) {
        if (line.trim() === "(none)") {
          inNotInSyncSection = false;
        } else if (line.trim() && !line.includes("File differences")) {
          // Found a commit hash line
          hasUnmergedCommits = true;
          inNotInSyncSection = false;
        } else if (line.includes("File differences")) {
          inNotInSyncSection = false;
        }
      }
      if (line.includes("File differences") && !syncOut.includes("(no differences)")) {
        hasFileDiffs = true;
      }
    }
    
    if (hasUnmergedCommits || hasFileDiffs) {
      checks.push({ name: "bd sync", ok: false, detail: "Pending changes - run 'bd sync'" });
    } else {
      checks.push({ name: "bd sync", ok: true, detail: "Synced" });
    }
  } else {
    checks.push({ name: "bd sync", ok: true, detail: "Synced" });
  }

  // Check 4: In-progress issues (informational)
  const { stdout: inProgressOut } = await pi.exec("bd", ["list", "--status=in_progress", "--json"], {
    timeout: 5000,
  });

  try {
    const issues = JSON.parse(inProgressOut || "[]");
    if (issues.length > 0) {
      checks.push({
        name: "In-progress issues",
        ok: true,
        detail: `${issues.length} issue(s) - consider closing or updating`,
      });
    } else {
      checks.push({ name: "In-progress issues", ok: true, detail: "None" });
    }
  } catch {
    // Non-JSON output, just skip this check
  }

  return checks;
}

function formatChecks(checks: Check[]): { summary: string; allOk: boolean } {
  const allOk = checks.every((c) => c.ok);
  const icon = allOk ? "✅" : "⚠️";
  const summary = `${icon} Preflight:\n` + checks
    .map((c) => `${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`)
    .join("\n");
  return { summary, allOk };
}

export default function (pi: HookAPI) {
  // Helper to run checks and warn
  async function guardSession(ctx: HookContext): Promise<boolean> {
    const beadsDir = join(ctx.cwd, ".beads");
    if (!existsSync(beadsDir)) {
      return true; // No beads, no checks needed
    }

    const checks = await runPreflightChecks(pi, ctx);
    const { summary, allOk } = formatChecks(checks);

    if (!allOk && ctx.hasUI) {
      ctx.ui.notify(summary, "warning");
    }
    return allOk;
  }

  // Run on /new or /resume
  pi.on("session_before_switch", async (_event, ctx) => {
    await guardSession(ctx);
  });

  // Run on exit (Ctrl+C, Ctrl+D)
  pi.on("session_shutdown", async (_event, ctx) => {
    await guardSession(ctx);
  });

  // /preflight command for manual checks
  pi.registerCommand("preflight", {
    description: "Check if work is ready to be handed off (committed, pushed, synced)",
    handler: async (_args, ctx) => {
      const checks = await runPreflightChecks(pi, ctx);
      const { summary, allOk } = formatChecks(checks);
      ctx.ui.notify(summary, allOk ? "info" : "warning");
    },
  });
}
