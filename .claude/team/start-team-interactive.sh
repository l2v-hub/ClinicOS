#!/usr/bin/env bash
set -e

SESSION="clinicos-team"
PROJECT="/mnt/c/Workspace/DG_SE_DEV/ClinicOS"
TEAM_DIR="$PROJECT/.claude/team"

if [ "$1" = "--file" ]; then
  TASK="$(cat "$2")"
elif [ $# -eq 0 ]; then
  echo "Inserisci il task da dare allo swarm:"
  read -r TASK
else
  TASK="$*"
fi

tmux kill-session -t "$SESSION" 2>/dev/null || true

BASE_CMD="cd $PROJECT && export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 && claude.exe; echo Claude exited; read"

p0=$(tmux new-session -d -s "$SESSION" -n "team" -P -F "#{pane_id}" "bash -lc '$BASE_CMD'")
tmux select-pane -t "$p0" -T "LEAD"

p1=$(tmux split-window -h -t "$p0" -P -F "#{pane_id}" "bash -lc '$BASE_CMD'")
tmux select-pane -t "$p1" -T "UIUX"

p2=$(tmux split-window -v -t "$p0" -P -F "#{pane_id}" "bash -lc '$BASE_CMD'")
tmux select-pane -t "$p2" -T "IMPLEMENTER"

p3=$(tmux split-window -v -t "$p1" -P -F "#{pane_id}" "bash -lc '$BASE_CMD'")
tmux select-pane -t "$p3" -T "QA"

tmux select-layout -t "$SESSION:0" tiled
tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format " #{pane_index} #{pane_title} "

sleep 6

cat > /tmp/clinicos-lead-prompt.txt <<PROMPT
Sei il LEAD / Orchestrator dello swarm ClinicOS.

TASK:
$TASK

Devi:
1. analizzare il task
2. dividerlo in sotto-attività
3. coordinare UIUX, IMPLEMENTER e QA
4. mantenere lo scope
5. evitare modifiche inutili
6. chiedere build finale
7. fare commit solo dopo build riuscita

Regole:
- usa Agent Team Mode
- mantieni ClinicOS in italiano
- non riscrivere tutta l'app
- non modificare backend/Prisma/deploy salvo richiesta esplicita
- non rompere VITE_API_URL
- non usare localhost hardcoded
- non usare database locale se il task riguarda Railway/Vercel
PROMPT

cat > /tmp/clinicos-uiux-prompt.txt <<PROMPT
Sei UIUX / UX-UI Pro Max Designer dello swarm ClinicOS.

TASK:
$TASK

Devi:
1. analizzare il requisito dal punto di vista UX/UI
2. proporre uno stile coerente con il design system ClinicOS
3. garantire tablet-first
4. evitare tooltip come interazione principale
5. verificare spacing, navigazione, card, tabelle, modali
6. dare indicazioni concrete all'IMPLEMENTER

Non fare modifiche fuori scope.
PROMPT

cat > /tmp/clinicos-implementer-prompt.txt <<PROMPT
Sei FRONTEND/BACKEND IMPLEMENTER dello swarm ClinicOS.

TASK:
$TASK

Devi:
1. leggere il task
2. implementare solo le modifiche necessarie
3. seguire le indicazioni del LEAD e UIUX
4. mantenere tutto in italiano
5. non rompere VITE_API_URL
6. non introdurre localhost hardcoded
7. non usare mock se il task richiede persistenza reale
8. eseguire modifiche incrementali

Alla fine prepara il codice per la build.
PROMPT

cat > /tmp/clinicos-qa-prompt.txt <<PROMPT
Sei QA / Build Reviewer dello swarm ClinicOS.

TASK:
$TASK

Devi:
1. verificare che il task sia stato rispettato
2. controllare regressioni UI/UX
3. controllare desktop/tablet
4. verificare no overflow orizzontale
5. eseguire npm run build quando richiesto
6. verificare eventuali API online se il task lo richiede
7. segnalare errori e gap

Non riscrivere funzionalità.
PROMPT

tmux load-buffer /tmp/clinicos-lead-prompt.txt
tmux paste-buffer -t "$p0"
sleep 1
tmux send-keys -t "$p0" C-m

tmux load-buffer /tmp/clinicos-uiux-prompt.txt
tmux paste-buffer -t "$p1"
sleep 1
tmux send-keys -t "$p1" C-m

tmux load-buffer /tmp/clinicos-implementer-prompt.txt
tmux paste-buffer -t "$p2"
sleep 1
tmux send-keys -t "$p2" C-m

tmux load-buffer /tmp/clinicos-qa-prompt.txt
tmux paste-buffer -t "$p3"
sleep 1
tmux send-keys -t "$p3" C-m

tmux attach -t "$SESSION"