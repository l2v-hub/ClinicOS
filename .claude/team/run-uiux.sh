#!/usr/bin/env bash
cd /mnt/c/Workspace/DG_SE_DEV/ClinicOS
TEAM=".claude/team"
CLAUDE="/mnt/c/Users/llavia/AppData/Local/Packages/Claude_pzs8sxrjxfjjc/LocalCache/Roaming/Claude/claude-code/2.1.92/claude.exe"
[ ! -x "$CLAUDE" ] && CLAUDE="claude"
echo "=== UI/UX REVIEWER starting ==="
"$CLAUDE" --dangerously-skip-permissions -p "$(cat $TEAM/uiux.md)"
echo "=== UI/UX REVIEWER done ==="
exec bash
