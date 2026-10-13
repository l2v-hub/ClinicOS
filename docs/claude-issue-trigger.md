# Nuova issue → sessione Claude cloud

Quando si apre una issue su `l2v-hub/ClinicOS`, il workflow
`.github/workflows/claude-issue-trigger.yml` chiama l'API `/fire` della Routine Claude Code
**"ClinicOS — risolvi nuova GitHub issue"**. Ogni fire apre una **nuova sessione cloud** che:

1. legge la issue, crea un branch `claude/issue-<n>-…`;
2. segue il Quality Gate (task contract → implementazione → validazione);
3. pusha, apre una PR (`Refs #<n>`) e commenta la issue con lo stato (READY FOR QA / BLOCKED / FAILED VALIDATION).

Non mergia, non deploya e non chiude issue. Le issue aperte da bot vengono ignorate.

> Perché l'API e non il trigger "GitHub event" delle Routine: quel trigger supporta solo
> eventi Pull request e Release, non `issues.opened`.

## Setup (una tantum)

1. Apri https://claude.ai/code/routines → **ClinicOS — risolvi nuova GitHub issue** → **Edit**.
   - Nei repository della routine aggiungi `l2v-hub/ClinicOS` (consigliato; altrimenti la sessione lo aggiunge da sola).
   - **Add another trigger → API → Generate token**. Il token si vede una sola volta.
   - Copia l'ID della routine (`trig_…`, anche nell'URL dell'endpoint mostrato).
2. Su GitHub → *Settings → Secrets and variables → Actions*:
   - **Secret** `CLAUDE_ROUTINE_TOKEN` = token generato;
   - **Variable** `CLAUDE_ROUTINE_ID` = ID della routine.
3. Apri una issue di prova: nel run del workflow (tab *Actions*) il summary riporta il link alla sessione.

Senza secret/variable il workflow termina con un warning e non fa nulla.

## Limiti

- 30 fire/ora per routine (condiviso con "Run now"), 100 fire/ora per account.
- Il testo della issue è trattato come dato non fidato; viene troncato a 30 000 caratteri.
- Revoca/rigenera il token dalla stessa schermata della routine.
