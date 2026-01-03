# pi-bd

[pi-coding-agent](https://github.com/badlogic/pi-mono) hook for [Beads](https://github.com/steveyegge/beads) issue tracking.

## What This Does

When you run `pi` in a project with a `.beads/` directory, this hook runs `bd prime` on session start so the agent understands your bd workflow.

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

## Usage

Just use `!bd <command>` in pi to run any bd command:

```
!bd ready          # Find available work
!bd show <id>      # View issue details
!bd close <id>     # Complete work
!bd sync           # Sync with git
```

## License

MIT
