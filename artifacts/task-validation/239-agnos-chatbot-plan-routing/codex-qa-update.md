## Codex QA update — diagnosi corretta del bug chatbot

Il problema segnalato dall'utente e' stato riprodotto sul percorso reale dell'app: il pannello Agnos non chiama direttamente `/ai/assistant/query`, ma invia il testo a `POST /ai/actions/plan`.

Root cause locale verificata:

- `backend/src/ai/voice/plan.ts` riconosceva solo pochi trigger di lettura, quindi domande naturali come "quante camere sono occupate oggi" potevano rimanere `unknown`.
- `backend/src/ai/actions/orchestrate.ts` non delegava gli `unknown` non-write all'assistant read-only, quindi Agnos non arrivava al gateway assistant/runtime e la UI mostrava errore/non trovato.
- `backend/src/ai/assistant/plan.ts` non aveva un intento/tool per occupazione camere, quindi anche dopo il routing la domanda sulle camere tornava `unknown -> notFound`.

Correzione locale applicata:

- ampliati gli interrogativi/read trigger italiani;
- fallback `unknown` non-write -> assistant read-only in `planCommand`;
- aggiunto intento `rooms_occupancy` + tool `query_rooms_occupancy` con source `ROOM_OCCUPANCY`;
- l'occupazione camere e' aggregata e non richiede cross-patient access.

Verifiche locali:

- `node_modules\.bin\tsx --test backend\src\ai\__tests__\assistant-plan.test.ts` -> 15/15 PASS
- `node_modules\.bin\tsx --test backend\src\ai\__tests__\actions.test.ts` -> 33/33 PASS
- `npm --prefix backend run build` -> PASS
- Playwright locale ha intercettato la richiesta reale della UI verso `/ai/actions/plan`; il DB locale pero' rifiuta connessioni (ECONNREFUSED/ETIMEDOUT su patient/therapy/appointments/notes/room), quindi la validazione contenuto dati finale richiede DB locale operativo o deploy su ambiente con DB.

Evidenza locale salvata in:

`artifacts/task-validation/239-agnos-chatbot-plan-routing/`

Stato PO/QA: non chiudere. Serve ancora validazione runtime su ambiente con DB/Agnos attivi e Playwright finale post-deploy prima di rimuovere `qa-failed`/`needs-evidence`.
