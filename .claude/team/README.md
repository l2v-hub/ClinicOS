# ClinicOS Agent Team

## How to start

Open WSL and run:
```bash
bash /mnt/c/Workspace/DG_SE_DEV/ClinicOS/.claude/team/start-team.sh
```

## Layout

```
┌─────────────────────┬─────────────────────┐
│   [0] TECH LEAD     │  [1] UI/UX REVIEWER │
│   Coordinates team  │  Analyzes UI/UX      │
│   Writes the plan   │  Finds visual issues  │
├─────────────────────┼─────────────────────┤
│  [2] FE IMPLEMENTER │  [3] QA REVIEWER    │
│  Maps codebase      │  Finds regressions   │
│  Applies fixes      │  Flags risky files   │
└─────────────────────┴─────────────────────┘
```

## tmux key bindings

| Key | Action |
|-----|--------|
| `Ctrl+B` then arrow | Move to another pane |
| `Ctrl+B` then `D` | Detach (agents keep running) |
| `tmux attach -t clinicos-team` | Re-attach |
| `Ctrl+B` then `Z` | Zoom in/out current pane |
| `Ctrl+B` then `[` | Scroll mode (q to exit) |

## Shared coordination file

All agents read/write: `.claude/team/tasks.md`

Phases:
1. **Analysis** — UI/UX, QA, Implementer work in parallel (read-only)
2. **Planning** — Tech Lead synthesizes findings
3. **Implementation** — Implementer applies changes (with file locks)
4. **Verification** — QA validates
5. **Synthesis** — Tech Lead writes final summary

## File conflict prevention

Before editing any file, agents must add a lock entry to tasks.md:
```
| frontend/src/components/Foo.tsx | FE IMPLEMENTER | editing |
```
Remove the entry when done.
