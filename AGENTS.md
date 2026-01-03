# Agent Instructions

This repo provides **pi-coding-agent hooks for Beads (bd)** issue tracking. It also uses beads to track its own development.

## Project Structure

```
.pi/hooks/          # The hooks (what gets distributed)
  bd-context.ts     # Auto-loads bd context on session start
  bd-commands.ts    # Slash commands (/bd-ready, /bd-claim, etc.)
  bd-session-guard.ts  # Warns on uncommitted work at session end
.beads/             # Issue tracking for this project
AGENTS.md           # This file
README.md           # User-facing docs
```

## bd Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details  
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Session Close Protocol

Before ending a session, complete these steps:

1. **Create issues** for any remaining/discovered work
2. **Run quality gates** if code changed (tests, linting)
3. **Close completed issues** - `bd close <id1> <id2> ...`
4. **Commit and sync**:
   ```bash
   git add .
   git commit -m "..."
   bd sync
   git push  # if branch has upstream
   ```
5. **Verify** - `git status` shows clean, `/preflight` passes

**Rules:**
- Don't end with uncommitted changes
- Don't leave issues in wrong state
- Use `/preflight` to check readiness

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
