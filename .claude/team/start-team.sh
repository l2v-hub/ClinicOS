#!/usr/bin/env bash
set -e

SESSION="clinicos-team"
PROJECT="/mnt/c/Workspace/DG_SE_DEV/ClinicOS"

tmux kill-session -t "$SESSION" 2>/dev/null || true

tmux new-session -d -s "$SESSION" -n "team" \
  "bash -lc 'cd $PROJECT && export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 && claude.exe < .claude/team/lead.md; echo LEAD exited; read'"

tmux split-window -h -t "$SESSION:0" \
  "bash -lc 'cd $PROJECT && export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 && claude.exe < .claude/team/uiux.md; echo UIUX exited; read'"

tmux split-window -v -t "$SESSION:0.0" \
  "bash -lc 'cd $PROJECT && export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 && claude.exe < .claude/team/implementer.md; echo IMPLEMENTER exited; read'"

tmux split-window -v -t "$SESSION:0.1" \
  "bash -lc 'cd $PROJECT && export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 && claude.exe < .claude/team/qa.md; echo QA exited; read'"

tmux select-layout -t "$SESSION:0" tiled

tmux set-option -t "$SESSION" pane-border-status top
tmux select-pane -t "$SESSION:0.0" -T "LEAD"
tmux select-pane -t "$SESSION:0.1" -T "UIUX"
tmux select-pane -t "$SESSION:0.2" -T "IMPLEMENTER"
tmux select-pane -t "$SESSION:0.3" -T "QA"

tmux attach -t "$SESSION"
