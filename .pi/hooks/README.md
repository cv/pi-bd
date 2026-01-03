# bd Hooks for pi

These hooks teach the pi coding agent how to use **bd** (beads) for issue tracking.

## Hooks

### bd-context.ts

Automatically injects bd workflow context when starting a session in a project with `.beads/`.

- Runs `bd prime` on session start
- Provides `/bd-prime` command to refresh context after compaction

### bd-commands.ts

Quick slash commands for common bd operations:

| Command | Description |
|---------|-------------|
| `/bd-ready` | Show issues ready to work on |
| `/bd-show <id>` | Show issue details |
| `/bd-claim <id>` | Claim an issue (set to in_progress) |
| `/bd-close <id> [reason]` | Close an issue |
| `/bd-sync` | Sync beads with git |
| `/bd-status` | Quick project health overview |

## Usage

These hooks are automatically loaded when running pi in this project directory.

To test a specific hook:

```bash
pi --hook .pi/hooks/bd-context.ts
```

## Workflow

1. **Start session**: Context auto-loaded from `bd prime`
2. **Find work**: `/bd-ready` or ask "what should I work on?"
3. **Claim issue**: `/bd-claim beads-xxx` or `bd update beads-xxx --status=in_progress`
4. **Do work**: Implement the issue
5. **Close issue**: `/bd-close beads-xxx` or `bd close beads-xxx`
6. **End session**: Commit and push
