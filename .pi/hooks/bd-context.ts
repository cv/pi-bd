/**
 * bd Context Hook
 *
 * Automatically injects bd (beads) workflow context at session start
 * when a .beads/ directory is detected. This teaches the agent how
 * to use bd for issue tracking.
 *
 * The hook runs `bd prime` to get AI-optimized workflow context and
 * injects it as the first message in the session.
 */

import type { HookAPI } from "@mariozechner/pi-coding-agent";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default function (pi: HookAPI) {
  pi.on("session_start", async (_event, ctx) => {
    // Check if .beads/ exists in cwd
    const beadsDir = join(ctx.cwd, ".beads");
    if (!existsSync(beadsDir)) {
      return;
    }

    // Run bd prime to get workflow context
    const { stdout, code } = await pi.exec("bd", ["prime"], {
      timeout: 5000,
    });

    if (code !== 0 || !stdout.trim()) {
      ctx.ui.notify("bd detected but prime failed", "warning");
      return;
    }

    // Inject the context as a message to the LLM
    pi.sendMessage({
      customType: "bd-context",
      content: stdout.trim(),
      display: false, // Don't clutter the UI, but send to LLM
      details: {
        source: "bd prime",
        timestamp: Date.now(),
      },
    });

    ctx.ui.notify("bd context loaded", "info");
  });

  // Also provide a /bd-prime command to refresh context manually
  pi.registerCommand("bd-prime", {
    description: "Refresh bd workflow context (run after compaction)",
    handler: async (_args, ctx) => {
      const { stdout, code } = await pi.exec("bd", ["prime"], {
        timeout: 5000,
      });

      if (code !== 0 || !stdout.trim()) {
        ctx.ui.notify("bd prime failed", "error");
        return;
      }

      pi.sendMessage({
        customType: "bd-context",
        content: stdout.trim(),
        display: false,
        details: {
          source: "bd prime (manual refresh)",
          timestamp: Date.now(),
        },
      });

      ctx.ui.notify("bd context refreshed", "info");
    },
  });
}
