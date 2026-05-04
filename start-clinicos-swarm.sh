#!/usr/bin/env bash
set -e

SESSION="clinicos-swarm"
PROJECT="/mnt/c/Workspace/DG_SE_DEV/ClinicOS"
CLAUDE_BIN="claude.exe"

tmux kill-session -t "$SESSION" 2>/dev/null || true

BASE_CMD="cd $PROJECT && export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 && $CLAUDE_BIN; echo Claude exited; read"

p0=$(tmux new-session -d -s "$SESSION" -n "agents" -P -F "#{pane_id}" "bash -lc '$BASE_CMD'")
tmux select-pane -t "$p0" -T "LEAD"

p1=$(tmux split-window -h -t "$p0" -P -F "#{pane_id}" "bash -lc '$BASE_CMD'")
tmux select-pane -t "$p1" -T "UX_UI"

p2=$(tmux split-window -v -t "$p0" -P -F "#{pane_id}" "bash -lc '$BASE_CMD'")
tmux select-pane -t "$p2" -T "FRONTEND"

p3=$(tmux split-window -v -t "$p1" -P -F "#{pane_id}" "bash -lc '$BASE_CMD'")
tmux select-pane -t "$p3" -T "QA_BUILD"

tmux select-layout -t "$SESSION:0" tiled

tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format " #{pane_index} #{pane_title} "

tmux attach -t "$SESSION"
