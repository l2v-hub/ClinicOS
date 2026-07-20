# Task Contract

## Task

- Title: Agnos Fase 1b personale con qualifica
- Slug: agnos-fase-1b-personale-con-qualifica
- Type: feature
- Date: 2026-07-19

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |      yes |
| Config / Env         |       no |

## Current Behaviour

Gli operatori nel frontend sono un **mock client-side** (`MOCK_OPERATORI` in App.tsx) senza persistenza;
il modello `Operator` esiste in DB (seed) ma **non ha endpoint CRUD** e non ha un campo qualifica. L'agente
Gestione non può elencare il personale.

## Expected Behaviour

- Schema: `Operator.qualifica String?` (migrazione nullable, applicata in prod da `startCommand` Railway).
- **CRUD reale `/operators`**: GET (lista mappata al tipo `Operatore`), POST (crea User+Operator), PUT
  (aggiorna reparto/telefono/ruolo/stato/qualifica). App.tsx carica gli operatori dal backend (non più mock)
  e le add/edit/toggle persistono via API; colore/iniziali derivati client-side; orari restano separati.
- Agnos: intent **`staff_list`** (Gestione) → lista personale con nome/ruolo/reparto/qualifica, SOURCE_ONLY,
  gated da `AI_FACILITY_QUERIES_ENABLED` (dato organizzativo, no PHID paziente).

## Acceptance Criteria

- AC1: `Operator.qualifica` e `Operator.ruolo` in schema + migrazione nullable (il ruolo deve
  persistere perché il PUT lo aggiorna — vedi Expected Behaviour); build backend con prisma generate verde.
- AC2: `/operators` GET/POST/PUT funzionanti sul DB reale; App.tsx usa i dati reali (no MOCK_OPERATORI); persistono dopo reload.
- AC3: la qualifica è impostabile dal form OperatorManagement e persiste.
- AC4: Agnos `staff_list` (Gestione) elenca il personale reale con qualifica; redirect da Clinico; SOURCE_ONLY.
- AC5: build FE+BE verdi; unit planner/agents verdi; suite backend verde.

## Test Plan

| Test type                 | Required | Reason                                                                             |
| ------------------------- | -------: | ---------------------------------------------------------------------------------- |
| Unit                      |      yes | Planner `staff_list` + agents (staff_list→facility)                                |
| Integration               |       no | Coperto da API + Playwright                                                        |
| API                       |      yes | GET/POST/PUT /operators sul DB (persistenza)                                       |
| Playwright                |      yes | Crea/modifica operatore+qualifica in admin, persiste dopo reload; Agnos staff_list |
| Persistence after refresh |      yes | Operatore creato/modificato deve sopravvivere al reload                            |
| Agnos action registry     |       no | Nessuna write Agnos                                                                |
| Voice simulation          |       no | Invariato                                                                          |
| OCR/import test           |       no | Non impattato                                                                      |
| Security/privacy scan     |      yes | /operators auth; staff = dato org (no PHI paziente); role-clamp invariato          |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

<!-- Rischi noti e mitigazioni. -->

## Gate Status

READY FOR IMPLEMENTATION
