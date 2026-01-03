/**
 * bd Context Hook
 *
 * Automatically injects bd (beads) workflow context at session start
 * when a .beads/ directory is detected.
 */

import type { HookAPI } from "@mariozechner/pi-coding-agent";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default function (pi: HookAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const beadsDir = join(ctx.cwd, ".beads");
    if (!existsSync(beadsDir)) {
      return;
    }

    const { stdout, code } = await pi.exec("bd", ["prime"], {
      timeout: 5000,
    });

    if (code !== 0 || !stdout.trim()) {
      ctx.ui.notify("bd detected but prime failed", "warning");
      return;
    }

    pi.sendMessage({
      customType: "bd-context",
      content: stdout.trim(),
      display: false,
    });

    ctx.ui.notify("bd context loaded", "info");
  });
}
