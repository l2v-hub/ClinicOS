#!/usr/bin/env bash
set -e

SESSION="clinicos-team"
PROJECT="/mnt/c/Workspace/DG_SE_DEV/ClinicOS"
TEAM_DIR="$PROJECT/.claude/team"

if [ $# -eq 0 ]; then
  echo "Inserisci il task da dare allo swarm:"
  read -r TASK
else
  TASK="$*"
fi

tmux kill-session -t "$SESSION" 2>/dev/null || true

BASE_CMD="cd $PROJECT && export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 && claude.exe"

# Avvio pannelli Claude interattivi
p0=$(tmux new-session -d -s "$SESSION" -n "team" -P -F "#{pane_id}" "bash -lc '$BASE_CMD; echo LEAD exited; read'")
tmux select-pane -t "$p0" -T "LEAD"

p1=$(tmux split-window -h -t "$p0" -P -F "#{pane_id}" "bash -lc '$BASE_CMD; echo UIUX exited; read'")
tmux select-pane -t "$p1" -T "UIUX"

p2=$(tmux split-window -v -t "$p0" -P -F "#{pane_id}" "bash -lc '$BASE_CMD; echo IMPLEMENTER exited; read'")
tmux select-pane -t "$p2" -T "IMPLEMENTER"

p3=$(tmux split-window -v -t "$p1" -P -F "#{pane_id}" "bash -lc '$BASE_CMD; echo QA exited; read'")
tmux select-pane -t "$p3" -T "QA"

tmux select-layout -t "$SESSION:0" tiled
tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format " #{pane_index} #{pane_title} "

# Attendo che Claude sia pronto
sleep 5

# Creo prompt temporanei da incollare nei vari Claude interattivi
cat > /tmp/clinicos-lead-prompt.txt <<PROMPT
$(cat "$TEAM_DIR/lead.md")

TASK PRINCIPALE DA ORCHESTRARE:
$TASK

Avvia il lavoro come LEAD.
Coordina UIUX, IMPLEMENTER e QA.
Scrivi o aggiorna .claude/team/tasks.md con il piano operativo.
Mantieni il lavoro incrementale.
Non riscrivere l'app.
Non modificare backend, Prisma o deploy salvo richiesta esplicita.
PROMPT

cat > /tmp/clinicos-uiux-prompt.txt <<PROMPT
$(cat "$TEAM_DIR/uiux.md")

TASK DI CONTESTO:
$TASK

Lavora come UI/UX Agent.
Analizza la richiesta dal punto di vista dell'usabilità.
Aggiorna .claude/team/tasks.md o un file di note se necessario.
Non modificare codice finché non è chiaro il piano.
PROMPT

cat > /tmp/clinicos-implementer-prompt.txt <<PROMPT
$(cat "$TEAM_DIR/implementer.md")

TASK DI CONTESTO:
$TASK

Lavora come Implementer Agent.
Leggi il piano del LEAD e implementa solo modifiche coerenti.
Mantieni tutto in italiano.
Non toccare backend, Prisma o deploy salvo richiesta esplicita.
PROMPT

cat > /tmp/clinicos-qa-prompt.txt <<PROMPT
$(cat "$TEAM_DIR/qa.md")

TASK DI CONTESTO:
$TASK

Lavora come QA Agent.
Verifica build, regressioni, errori runtime e interazioni.
Esegui npm run build quando richiesto.
Non riscrivere funzionalità.
PROMPT

# Incollo i prompt nei pannelli
tmux load-buffer /tmp/clinicos-lead-prompt.txt
tmux paste-buffer -t "$p0"
tmux send-keys -t "$p0" Enter

tmux load-buffer /tmp/clinicos-uiux-prompt.txt
tmux paste-buffer -t "$p1"
tmux send-keys -t "$p1" Enter

tmux load-buffer /tmp/clinicos-implementer-prompt.txt
tmux paste-buffer -t "$p2"
tmux send-keys -t "$p2" Enter

tmux load-buffer /tmp/clinicos-qa-prompt.txt
tmux paste-buffer -t "$p3"
tmux send-keys -t "$p3" Enter

tmux attach -t "$SESSION"
