# Task Validation Report

## Task

- Title: Milo casi d'uso e dati di prova
- Slug: milo-casi-d-uso-e-dati-di-prova
- Commit: PR #552 (merge `1d7d6347f` su `main`)
- Date: 2026-11-23

## Implementation Summary

Dati di prova e cinque casi d'uso per provare Milo e i suoi specialisti.

- **Dati di prova** nel seed sintetico (`backend/src/synthetic/milo-scenarios.ts`): una settimana di
  parametri per tre pazienti con andamenti diversi, autori con orario di lavoro, medico con visita e
  nota, camere singole e doppie con dimissioni previste, una terapia finita ieri. Ripetibile.
- **Caso 1** — quadro del paziente e punti da controllare calcolati dal protocollo NEWS2
  (`ai/gateway/clinical-attention.ts`), mai dal modello.
- **Caso 2** — chi ha registrato e chi ha visitato, con i turni (`get_patient_care_contacts`).
- **Caso 3** — occupazione per tipo di camera e prossime liberazioni.
- **Caso 4** — nuova azione `create_parameter_reading`: più parametri in una rilevazione della pagina
  Parametri, con anteprima e conferma, scritta dal servizio della pagina.
- **Caso 5** — Milo prepara il testo per il flusso «Prepara prescrizione» del medico (mai il farmaco al
  posto suo) e nuovo segnale `therapy.completed` per chi ha prescritto.
- Competenze degli specialisti in file con versione; raccolta di prove dei casi
  (`backend/src/ai/evals/milo-cases.ts`, `scripts/milo-evals/run.mts`).

## Files Changed

- Backend: `ai/actions/{parameters,parameter-dictation,prescriptions,orchestrate,catalog}.ts`,
  `ai/voice/{types,execute,write-services}.ts`, `ai/gateway/{care-reads,clinical-attention,clinical-reads}.ts`,
  `ai/assistant/{plan,blocks,service,llm-planner,read-tools,team,agents}.ts`, `ai/evals/milo-cases.ts`,
  `proactive/{catalog,sources,engine}.ts`, `routes/ai-actions.ts`, `synthetic/{index,milo-scenarios}.ts`,
  registro e catalogo dei permessi, test.
- Servizio AI: `clinicos_ai/skills/*`, `agents/{team,assistant}.py`, `domain/contracts.py`, test.
- Frontend: `agnos/{MiloBlocks,agnosActionNavigation}.tsx`, `AIAssistantButton.tsx`,
  `assistant/AssistantMode.tsx`, `operator/PatientDetail.tsx`, `App.tsx`, `App.css`, `lib/miloEvents.ts`.
- Documentazione: `docs/product/milo-casi-d-uso.md`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                              |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `tests/integration/milo-scenarios-seed.test.mts` (seed due volte, nessun doppione); sulla demo: seed 200, secondo seed con gli stessi conteggi (`logs/demo-verification.txt`)                                                         |
| AC2 |   PASS | sulla demo i casi 1–3 leggono i dati giusti con fonti: `evidence/01-…`, `02-…`, `03-…`; prove 8/8 (`evidence/milo-evals-demo.json`)                                                                                                   |
| AC3 |   PASS | sulla demo: anteprima con i quattro valori, conferma → rilevazioni 15 → 16 con pa 128/76, fc 81, coscienza A, evacuazione Sì; valore mancante → conferma disabilitata (`evidence/04a…04d`)                                            |
| AC4 |   PASS | sulla demo: anteprima «Nuova prescrizione» con orari 06:00/14:00/22:00 e fine al quinto giorno, «Conferma» del medico (`evidence/05h`); segnale «Terapia completata … (prescritta da te)» priorità alta; rifiuto per l'OSS (`05f`) |
| AC5 |   PASS | CI della PR #552 verde (13 controlli); in locale backend, frontend 1626/0, build, servizio AI                                                                                                                                         |
| AC6 |   PASS | `logs/demo-verification.txt`, schermate in `evidence/`                                                                                                                                                                                |

## Test Results

| Test             | Result | Evidence                                                                                                         |
| ---------------- | -----: | ---------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | `milo-use-cases` 5, `milo-parameter-action` 10, `milo-prescription-handoff` 8, `milo-evals` 5 (CI #552)          |
| Integration      |   PASS | `milo-scenarios-seed` 6 (PGlite), `proactive-e2e` 25, `assistant-e2e` 12 (Postgres)                              |
| API              |   PASS | sulla demo: `/ai/actions/plan`, `/ai/actions/execute`, `/admin/synthetic-data/seed`, `/skills/proactive/inbox`   |
| Playwright       |   PASS | sulla demo, profili Infermiere 1, Supervisore 1, Medico 1, OSS 1: schermate in `evidence/`                       |
| Persistence      |   PASS | la rilevazione confermata è nello storico della pagina Parametri (lettura dal servizio dopo la conferma)         |
| Agnos AI         |   PASS | team sulla demo per i casi 2 e 3 (clinico, struttura) con fonti verificate; caso 1 dal percorso classico         |
| Voice            |   PASS | comandi dei casi 4 e 5 come testo trascritto (stesso percorso del canale voce), numeri in parole nei test        |
| OCR              |     NA |                                                                                                                  |
| Security/privacy |   PASS | conferma obbligatoria, rifiuto per ruolo senza permesso, nessun farmaco nominato da Milo, perimetro del paziente |

## Runtime Evidence

Demo: servizio AI `c631573a`, backend `177399fa` (commit `1d7d6347f`), interfaccia
`clinicos-e02u89tb8` in produzione. Dettaglio, con orari, in `logs/demo-verification.txt`.

Limiti osservati, fuori dai criteri di questo contratto e portati nel contratto delle competenze:

- caso 1: il team supera i 60 secondi (11–12 letture) e risponde il percorso classico, dopo circa
  75 secondi; la risposta è corretta ma lenta;
- caso 5: senza la via di somministrazione l'anteprima non offre «Conferma»; Milo deve chiederla
  prima di preparare il testo.

## Logs

`logs/demo-verification.txt`. Only sanitized logs are allowed: dati sintetici, nessun segreto.

## Final Decision

CLOSED — VERIFIED
