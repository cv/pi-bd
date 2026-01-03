# Agent Instructions

This repo provides a **pi-coding-agent hook for Beads (bd)** issue tracking.

## What's Here

```
.pi/hooks/bd-context.ts   # Auto-loads bd context on session start
.beads/                   # Issue tracking for this project
```

## bd Commands

```bash
bd ready              # Find available work
bd show <id>          # View issue details  
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```
