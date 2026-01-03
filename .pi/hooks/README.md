# bd Hooks for pi

This hook teaches the pi coding agent how to use **bd** (beads) for issue tracking.

## bd-context.ts

Automatically injects bd workflow context when starting a session in a project with `.beads/`.

- Runs `bd prime` on session start
- Provides `/bd-prime` command to refresh context after compaction

## Usage

These hooks are automatically loaded when running pi in this project directory.

Use `!bd <command>` for any bd operations:

```
!bd ready          # Find available work  
!bd show <id>      # View issue details
!bd close <id>     # Complete work
!bd sync           # Sync with git
```
