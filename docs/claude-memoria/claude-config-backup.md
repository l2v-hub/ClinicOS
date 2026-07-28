---
name: claude-config-backup
description: 'Where Claude Code settings/config snapshots are saved + the key config state (agent teams, statusline, plugins, hooks)'
metadata:
  node_type: memory
  type: reference
  originSessionId: 09bcb901-c431-4ba6-b6f3-54d87ae51d43
---

Config backup snapshots live in `~/.claude/backups/config-<YYYYMMDD-HHMMSS>/` (global/ + project/ + MANIFEST.md). Latest created 2026-07-16.

Key config state at backup:

- **Agent teams**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `~/.claude/settings.json` env → enabled globally for all sessions.
- **Statusline**: custom `~/.claude/statusline.ps1` (model + context progress bar), wired with `-NoProfile` (required — profile breaks stdin).
- **Hooks (global)**: SessionStart → session-start.ps1; PreToolUse/Bash → `rtk hook claude`; PostToolUse/Edit|Write → post-edit-checks.ps1.
- **Governance**: Codex Gate + QA Gate (skill `.claude/skills/qa-gate` + CLAUDE.md section) + Parallel Evidence Remediation. See [[clinicos-evidence-workflow]].
- Sensitive files in backup (`settings.local.json`, `claude.json`) may contain tokens — treat as secrets, local-only.

To re-back-up: copy the settings.json/local, statusline.ps1, CLAUDE.md/RTK.md, mcp.json, hooks, and `~/.claude.json` (global) + `.claude/settings*.json`, CLAUDE.md, AGENTS.md (project) into a fresh timestamped dir.
