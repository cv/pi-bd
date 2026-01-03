/**
 * bd Session Guard Hook
 *
 * Ensures work is properly committed and pushed before ending a session.
 * Implements the "Landing the Plane" protocol from AGENTS.md.
 *
 * On session shutdown:
 * - Checks for uncommitted changes
 * - Checks for unpushed commits
 * - Warns if bd sync is needed
 */

import type { HookAPI } from "@mariozechner/pi-coding-agent";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default function (pi: HookAPI) {
  pi.on("session_shutdown", async (_event, ctx) => {
    // Only run if .beads/ exists
    const beadsDir = join(ctx.cwd, ".beads");
    if (!existsSync(beadsDir)) {
      return;
    }

    const warnings: string[] = [];

    // Check for uncommitted changes
    const { stdout: statusOut, code: statusCode } = await pi.exec("git", ["status", "--porcelain"], {
      timeout: 5000,
    });

    if (statusCode === 0 && statusOut.trim()) {
      const changedFiles = statusOut.trim().split("\n").filter(Boolean).length;
      warnings.push(`${changedFiles} uncommitted file(s)`);
    }

    // Check for unpushed commits
    const { stdout: cherryOut, code: cherryCode } = await pi.exec("git", ["cherry", "-v"], {
      timeout: 5000,
    });

    if (cherryCode === 0 && cherryOut.trim()) {
      const unpushed = cherryOut.trim().split("\n").filter(Boolean).length;
      warnings.push(`${unpushed} unpushed commit(s)`);
    }

    // Check bd sync status
    const { stdout: syncOut, code: syncCode } = await pi.exec("bd", ["sync", "--status"], {
      timeout: 5000,
    });

    if (syncCode !== 0 || (syncOut && syncOut.includes("pending"))) {
      warnings.push("bd sync may be needed");
    }

    if (warnings.length > 0) {
      ctx.ui.notify(`⚠️ ${warnings.join(", ")}`, "warning");
    }
  });

  // Provide a /preflight command to check readiness before ending
  pi.registerCommand("preflight", {
    description: "Check if work is ready to be handed off (committed, pushed, synced)",
    handler: async (_args, ctx) => {
      const checks: { name: string; ok: boolean; detail: string }[] = [];

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
      const { stdout: syncOut, code: syncCode } = await pi.exec("bd", ["sync", "--status"], {
        timeout: 5000,
      });

      if (syncCode !== 0) {
        checks.push({ name: "bd sync", ok: false, detail: "Sync check failed" });
      } else if (syncOut && syncOut.toLowerCase().includes("pending")) {
        checks.push({ name: "bd sync", ok: false, detail: "Pending changes" });
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

      // Display results
      const allOk = checks.every((c) => c.ok);
      const icon = allOk ? "✅" : "⚠️";

      const summary = checks
        .map((c) => `${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`)
        .join("\n");

      if (ctx.hasUI) {
        ctx.ui.notify(`${icon} Preflight:\n${summary}`, allOk ? "info" : "warning");
      }
    },
  });
}
