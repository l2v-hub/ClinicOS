#!/usr/bin/env bash
# ============================================================
# ClinicOS Agent Team — tmux launcher
# Run this script from WSL:  bash /mnt/c/Workspace/DG_SE_DEV/ClinicOS/.claude/team/start-team.sh
# ============================================================

set -e

SESSION="clinicos-team"
PROJECT="/mnt/c/Workspace/DG_SE_DEV/ClinicOS"
TEAM="$PROJECT/.claude/team"

# Detect claude binary (Windows interop from WSL)
CLAUDE_WIN="/mnt/c/Users/llavia/AppData/Local/Packages/Claude_pzs8sxrjxfjjc/LocalCache/Roaming/Claude/claude-code/2.1.92/claude"
if command -v claude &>/dev/null; then
  CLAUDE_BIN="claude"
elif [ -x "$CLAUDE_WIN" ]; then
  CLAUDE_BIN="$CLAUDE_WIN"
else
  echo "ERROR: claude binary not found. Update CLAUDE_WIN path in this script."
  exit 1
fi

echo "Using claude: $CLAUDE_BIN"
echo "Project: $PROJECT"

# Reset tasks.md to initial state
cat > "$TEAM/tasks.md" << 'TASKS'
# ClinicOS Agent Team — Shared Task Board

## Phase Status
- [ ] PHASE 1 — Analysis (UI/UX + QA review, Implementer maps codebase)
- [ ] PHASE 2 — Planning (Tech Lead synthesizes findings, assigns work)
- [ ] PHASE 3 — Implementation (Implementer applies changes)
- [ ] PHASE 4 — Verification (QA validates changes)
- [ ] PHASE 5 — Synthesis (Tech Lead writes final summary)

## File Lock Table (MUST update before editing any file)
| File | Locked By | Status |
|------|-----------|--------|
| _none_ | _none_ | free |

---

## UI/UX Reviewer — Findings
_Status: pending_

---

## QA/Test Reviewer — Findings
_Status: pending_

---

## Frontend Implementer — Codebase Map
_Status: pending_

---

## Tech Lead — Plan
_Status: waiting for Phase 1_

---

## Final Synthesis
_Status: pending_
TASKS

echo "tasks.md reset."

# Kill any existing session
tmux kill-session -t "$SESSION" 2>/dev/null && echo "Killed old session." || true

# Create new session — pane 0 = Tech Lead (top-left)
tmux new-session -d -s "$SESSION" -x 220 -y 55 -c "$PROJECT"

# Split right (pane 1 = UI/UX Reviewer, top-right)
tmux split-window -h -t "$SESSION:0.0" -c "$PROJECT"

# Split pane 0 down (pane 2 = Frontend Implementer, bottom-left)
tmux split-window -v -t "$SESSION:0.0" -c "$PROJECT"

# Split pane 1 down (pane 3 = QA Reviewer, bottom-right)
tmux split-window -v -t "$SESSION:0.1" -c "$PROJECT"

# ---- Pane titles ----
tmux select-pane -t "$SESSION:0.0" -T "TECH LEAD"
tmux select-pane -t "$SESSION:0.1" -T "UI/UX REVIEWER"
tmux select-pane -t "$SESSION:0.2" -T "FE IMPLEMENTER"
tmux select-pane -t "$SESSION:0.3" -T "QA REVIEWER"

# ---- Status bar with pane titles ----
tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format " #{pane_title} "

# ---- Start agents ----
# Pane 0 — Tech Lead (starts last after giving others a head start)
LEAD_CMD="echo '=== TECH LEAD ===' && $CLAUDE_BIN --dangerously-skip-permissions -p \"\$(cat '$TEAM/lead.md')\"; echo '=== TECH LEAD DONE ==='; bash"

# Pane 1 — UI/UX Reviewer
UIUX_CMD="echo '=== UI/UX REVIEWER ===' && $CLAUDE_BIN --dangerously-skip-permissions -p \"\$(cat '$TEAM/uiux.md')\"; echo '=== UI/UX DONE ==='; bash"

# Pane 2 — Frontend Implementer
FE_CMD="echo '=== FE IMPLEMENTER ===' && $CLAUDE_BIN --dangerously-skip-permissions -p \"\$(cat '$TEAM/implementer.md')\"; echo '=== FE DONE ==='; bash"

# Pane 3 — QA Reviewer
QA_CMD="echo '=== QA REVIEWER ===' && $CLAUDE_BIN --dangerously-skip-permissions -p \"\$(cat '$TEAM/qa.md')\"; echo '=== QA DONE ==='; bash"

# Start reviewers and implementer first
tmux send-keys -t "$SESSION:0.1" "$UIUX_CMD" Enter
tmux send-keys -t "$SESSION:0.2" "$FE_CMD" Enter
tmux send-keys -t "$SESSION:0.3" "$QA_CMD" Enter

# Small delay then start Tech Lead
sleep 2
tmux send-keys -t "$SESSION:0.0" "$LEAD_CMD" Enter

echo ""
echo "Team launched in tmux session: $SESSION"
echo ""
echo "Layout:"
echo "  [0] TECH LEAD        | [1] UI/UX REVIEWER"
echo "  [2] FE IMPLEMENTER   | [3] QA REVIEWER"
echo ""
echo "Attaching now... (Ctrl+B D to detach, Ctrl+B arrow to switch panes)"
echo ""

# Attach
tmux attach-session -t "$SESSION"
