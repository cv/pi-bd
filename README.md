# pi-bd

[pi-coding-agent](https://github.com/badlogic/pi-mono) hooks for [Beads](https://github.com/steveyegge/beads) issue tracking.

## What This Does

When you run `pi` in a project with a `.beads/` directory, these hooks:

- **Auto-load context** - Runs `bd prime` on session start so the agent understands your workflow
- **Provide slash commands** - Quick access to common bd operations

## Installation

Add to your global settings (`~/.pi/agent/settings.json`):

```json
{
  "hooks": {
    "paths": ["git:https://github.com/cv/pi-bd"]
  }
}
```

Or try it first:

```bash
pi --hook git:https://github.com/cv/pi-bd
```

### Requirements

- [pi-coding-agent](https://github.com/badlogic/pi-mono) installed
- [Beads](https://github.com/steveyegge/beads) (`bd`) installed and on PATH

## Slash Commands

| Command | Description |
|---------|-------------|
| `/bd-ready` | Show issues ready to work on |
| `/bd-show <id>` | Show issue details |
| `/bd-claim <id>` | Claim an issue (set to in_progress) |
| `/bd-close <id> [reason]` | Close an issue |
| `/bd-sync` | Sync beads with git |
| `/bd-status` | Quick project health overview |
| `/bd-prime` | Refresh bd context (after compaction) |

## Hooks

| Hook | Purpose |
|------|---------|
| `bd-context.ts` | Injects workflow context on session start |
| `bd-commands.ts` | Registers slash commands |

## License

MIT
