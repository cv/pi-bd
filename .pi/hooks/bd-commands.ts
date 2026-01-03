/**
 * bd Commands Hook
 *
 * Provides quick slash commands for common bd operations.
 * These are shortcuts that work in the pi UI without running bash.
 */

import type { HookAPI } from "@mariozechner/pi-coding-agent";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default function (pi: HookAPI) {
  // /bd-ready - Show available work
  pi.registerCommand("bd-ready", {
    description: "Show issues ready to work on (no blockers)",
    handler: async (_args, ctx) => {
      const { stdout, code } = await pi.exec("bd", ["ready"], {
        timeout: 10000,
      });

      if (code !== 0) {
        ctx.ui.notify("bd ready failed", "error");
        return;
      }

      if (!stdout.trim()) {
        ctx.ui.notify("No ready issues found", "info");
        return;
      }

      // Inject ready issues as context for the LLM
      pi.sendMessage({
        customType: "bd-ready",
        content: `## Available Work (bd ready)\n\n${stdout.trim()}`,
        display: true,
        details: {
          timestamp: Date.now(),
        },
      });
    },
  });

  // /bd-show <id> - Show issue details
  pi.registerCommand("bd-show", {
    description: "Show details for a specific issue",
    handler: async (args, ctx) => {
      const issueId = args.trim();
      if (!issueId) {
        ctx.ui.notify("Usage: /bd-show <issue-id>", "error");
        return;
      }

      const { stdout, code } = await pi.exec("bd", ["show", issueId], {
        timeout: 5000,
      });

      if (code !== 0) {
        ctx.ui.notify(`Issue ${issueId} not found`, "error");
        return;
      }

      pi.sendMessage({
        customType: "bd-show",
        content: `## Issue Details: ${issueId}\n\n${stdout.trim()}`,
        display: true,
        details: {
          issueId,
          timestamp: Date.now(),
        },
      });
    },
  });

  // /bd-claim <id> - Start working on an issue
  pi.registerCommand("bd-claim", {
    description: "Claim an issue and set status to in_progress",
    handler: async (args, ctx) => {
      const issueId = args.trim();
      if (!issueId) {
        ctx.ui.notify("Usage: /bd-claim <issue-id>", "error");
        return;
      }

      const { code, stderr } = await pi.exec(
        "bd",
        ["update", issueId, "--status=in_progress"],
        { timeout: 5000 }
      );

      if (code !== 0) {
        ctx.ui.notify(`Failed to claim ${issueId}: ${stderr}`, "error");
        return;
      }

      ctx.ui.notify(`Claimed ${issueId}`, "info");

      // Also show the issue details
      const { stdout } = await pi.exec("bd", ["show", issueId], {
        timeout: 5000,
      });

      if (stdout.trim()) {
        pi.sendMessage({
          customType: "bd-claim",
          content: `## Claimed Issue: ${issueId}\n\n${stdout.trim()}\n\n---\n*Status set to in_progress*`,
          display: true,
          details: {
            issueId,
            timestamp: Date.now(),
          },
        });
      }
    },
  });

  // /bd-close <id> [reason] - Close an issue
  pi.registerCommand("bd-close", {
    description: "Close an issue (optionally with a reason)",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      const issueId = parts[0];
      const reason = parts.slice(1).join(" ");

      if (!issueId) {
        ctx.ui.notify("Usage: /bd-close <issue-id> [reason]", "error");
        return;
      }

      const closeArgs = ["close", issueId];
      if (reason) {
        closeArgs.push(`--reason=${reason}`);
      }

      const { code, stderr } = await pi.exec("bd", closeArgs, {
        timeout: 5000,
      });

      if (code !== 0) {
        ctx.ui.notify(`Failed to close ${issueId}: ${stderr}`, "error");
        return;
      }

      ctx.ui.notify(`Closed ${issueId}`, "info");
    },
  });

  // /bd-sync - Sync with git
  pi.registerCommand("bd-sync", {
    description: "Sync beads with git (run at session end)",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Running bd sync...", "info");

      const { stdout, stderr, code } = await pi.exec("bd", ["sync"], {
        timeout: 30000,
      });

      if (code !== 0) {
        ctx.ui.notify(`bd sync failed: ${stderr}`, "error");
        return;
      }

      ctx.ui.notify("bd sync complete", "info");

      if (stdout.trim()) {
        pi.sendMessage({
          customType: "bd-sync",
          content: `## bd sync output\n\n\`\`\`\n${stdout.trim()}\n\`\`\``,
          display: true,
          details: {
            timestamp: Date.now(),
          },
        });
      }
    },
  });

  // /bd-status - Quick overview of project health
  pi.registerCommand("bd-status", {
    description: "Show project status (open, in-progress, blocked counts)",
    handler: async (_args, ctx) => {
      // Get counts for different statuses
      const [openResult, inProgressResult, blockedResult] = await Promise.all([
        pi.exec("bd", ["count", "--status=open"], { timeout: 5000 }),
        pi.exec("bd", ["count", "--status=in_progress"], { timeout: 5000 }),
        pi.exec("bd", ["blocked", "--json"], { timeout: 5000 }),
      ]);

      const openCount = openResult.stdout.trim() || "?";
      const inProgressCount = inProgressResult.stdout.trim() || "?";

      let blockedCount = "?";
      try {
        const blocked = JSON.parse(blockedResult.stdout || "[]");
        blockedCount = String(blocked.length);
      } catch {
        // Ignore parse errors
      }

      const status = `📊 Open: ${openCount} | In Progress: ${inProgressCount} | Blocked: ${blockedCount}`;
      ctx.ui.notify(status, "info");
    },
  });
}
