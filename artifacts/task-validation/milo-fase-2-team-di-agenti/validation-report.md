# Task Validation Report

## Task

- Title: Milo fase 2 team di agenti
- Slug: milo-fase-2-team-di-agenti
- Commit: vedi `git log` del ramo `claude/relaxed-wright-t5j39k` (commit «Milo fasi 1–3»)
- Date: 2026-11-22

## Implementation Summary

Team Agno nel servizio AI (`clinicos_ai/agents/team.py`): coordinatore Milo e tre specialisti
(clinico, sorveglianza, struttura), ognuno con i propri strumenti. Il team legge i dati solo tramite
il backend, con una delega per domanda:

- la delega dura circa 3 minuti e ammette al massimo 12 letture;
- il servizio chiama `/internal/ai/tools/:tool` con token di servizio e delega.

Il backend verifica la risposta: le fonti citate devono essere tra quelle restituite alla delega,
non deve dichiarare azioni eseguite, deve esserci almeno una lettura. In caso contrario risponde il
percorso classico.

Altre modifiche:

- il pannello mostra il testo discorsivo, le fonti numerate e gli specialisti;
- gli ultimi 6 scambi della conversazione passano come contesto;
- `AI_CLINICAL_DATA_TO_MODEL=deny` spegne team e compositore;
- l'interruttore `AI_ASSISTANT_TEAM_ENABLED` è spento di default.

## Files Changed

Backend: `ai/assistant/{agent-grants,team,config,runtime-client,service}.ts`,
`routes/internal-ai.ts`, `routes/ai-actions.ts`, `ai/actions/orchestrate.ts`,
`lib/observability.ts`. Runtime: `agents/team.py`, `api/app.py`, `domain/contracts.py`,
`requirements.txt` (`agno==3.2.1`). Frontend: `AIAssistantButton.tsx`, `agnos/useAgnosChat.ts`,
`App.css`. Test: `milo-phase2-config.test.ts`, `tests/integration/milo-phase2-team.test.mts`,
`clinicos-ai-runtime/tests/test_milo_team.py`, `agnos/miloTeamAnswer.test.ts`.

## Acceptance Criteria Result

| AC  |  Result | Evidence                                                                                                                                                                  |
| --- | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |    PASS | `logs/runtime-tests.log`: `test_milo_team.py` (Agno Team reale, modello simulato compatibile, backend simulato), solo strumenti offerti dal backend                       |
| AC2 |    PASS | `logs/integration-milo-phase2.log`: senza token o con delega invalida 401, fuori perimetro 403, strumento di scrittura 404, fra pazienti 403, limite 429, delega revocata |
| AC3 |    PASS | integrazione: fonti inventate, dichiarazione di azioni, nessuna lettura, servizio giù → `null`; risposta classica end-to-end                                              |
| AC4 |    PASS | integrazione: `refuse_clinical` prima del team                                                                                                                            |
| AC5 |    PASS | `logs/frontend-tests.log` (`miloTeamAnswer.test.ts`), `parseConversationHistory` (unit)                                                                                   |
| AC6 |    PASS | `logs/unit-milo-phase2.log`                                                                                                                                               |
| AC7 |    PASS | `logs/backend-suite-summary.log` (0 fallimenti nuovi), runtime 255 OK, frontend 1606 OK, build                                                                            |
| AC8 | NOT RUN | richiede il rilascio sulla demo e l'attivazione dell'interruttore: non ancora fatto                                                                                       |

## Test Results

| Test             |  Result | Evidence                                                                                               |
| ---------------- | ------: | ------------------------------------------------------------------------------------------------------ |
| Unit             |    PASS | `logs/unit-milo-phase2.log`                                                                            |
| Integration      |    PASS | `logs/integration-milo-phase2.log` (5/5)                                                               |
| API              |    PASS | `/internal/ai/tools/:tool` su Express reale in integrazione; `/v1/assistant/team` nei test del runtime |
| Playwright       | NOT RUN | previsto dopo il rilascio (pannello con risposta del team)                                             |
| Persistence      |      NA | sola lettura                                                                                           |
| Agnos AI         |    PASS | strumenti del team = strumenti consentiti al ruolo                                                     |
| Voice            |      NA |                                                                                                        |
| OCR              |      NA |                                                                                                        |
| Security/privacy |    PASS | delega, perimetro, gate fra pazienti, dati letti racchiusi come non attendibili (runtime)              |

## Runtime Evidence

Solo locale (PGlite, modello simulato). Nessuna misura con il modello reale.

## Logs

`logs/unit-milo-phase2.log`, `logs/integration-milo-phase2.log`, `logs/runtime-tests.log`,
`logs/frontend-tests.log`, `logs/frontend-build.log`, `logs/backend-suite-summary.log`.

## Residual Risks

- Comportamento e tempi con il modello reale: da misurare sulla demo (AC8).
- La delega è in memoria del processo: valida con una sola istanza del backend.

## Final Decision

IMPLEMENTED — NOT VERIFIED
