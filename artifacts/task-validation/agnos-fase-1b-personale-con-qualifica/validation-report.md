# Task Validation Report

## Task

- Title: Agnos Fase 1b personale con qualifica (opzione A + CRUD operatori completo)
- Slug: agnos-fase-1b-personale-con-qualifica
- Commit: (pre-commit — working tree validato localmente)
- Date: 2026-07-20

## Implementation Summary

- **Schema**: `Operator.ruolo` + `Operator.qualifica` (nullable, additive) — migrazione
  `prisma/migrations/20260719120000_operator_ruolo_qualifica/migration.sql`, applicata al DB e2e locale.
- **Backend**: nuova route `backend/src/routes/operators.ts` montata su `/operators`
  (GET lista mappata al tipo FE `Operatore`, POST crea User+Operator, PUT aggiorna
  anagrafica/ruolo/qualifica/stato); email unica → 409, campi obbligatori → 400.
- **Agnos**: intent `staff_list` (facility-only) — planner deterministico (`plan.ts`), tool
  `query_staff_list` in allowlist read (`read-tools.ts`, `llm-planner.ts`), executor
  `staffList()` in `service.ts` gated `canFacilityRead` (AI_FACILITY_QUERIES_ENABLED),
  source `STAFF` (SOURCE_ONLY); espone solo fullName/ruolo/qualifica/reparto/stato (no email/telefono).
- **Frontend**: App.tsx carica/crea/aggiorna/toggle via API (MOCK_OPERATORI rimosso;
  iniziali/colore client-derived); OperatorManagement: campo Qualifica nel form, qualifica in
  tabella (colonna Ruolo), email obbligatoria.
- **Fix collaterale**: `OPERATOR_COLOR_PALETTE` conteneva `#C77700` duplicato → React
  "duplicate key" all'apertura del form (preesistente); deduplicato (`#0EA5E9`).

## Files Changed

- prisma/schema.prisma · prisma/migrations/20260719120000_operator_ruolo_qualifica/migration.sql
- backend/src/routes/operators.ts (new) · backend/src/app.ts
- backend/src/ai/assistant/{plan,agents,read-tools,llm-planner,service}.ts
- backend/src/ai/gateway/{types,sources}.ts
- backend/src/ai/**tests**/staff-list.test.ts (new)
- frontend/src/types.ts · frontend/src/App.tsx · frontend/src/components/admin/OperatorManagement.tsx
- qa-evidence/tests/fase-1b-operatori.spec.ts (new)

## Acceptance Criteria Result

| AC                                                               | Result | Evidence                                                                                                                                                                        |
| ---------------------------------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 schema+migrazione, prisma generate verde                     |   PASS | build backend verde (prisma generate + tsc); migrazione applicata su clinicos_test (psql ALTER TABLE ok)                                                                        |
| AC2 CRUD /operators reale, App.tsx senza mock, persistenza       |   PASS | logs/api-crud-test.log (POST 201/409/400, PUT, GET, riga psql); Playwright: righe seed visibili, "Ferretti" (mock) assente, reload OK                                           |
| AC3 qualifica dal form e persiste                                |   PASS | Playwright: crea con qualifica "OSS", edit → "OSS Specializzato", persiste dopo 2 reload; screenshots/operatori-qualifica-final.png                                             |
| AC4 Agnos staff_list facility, redirect da clinical, SOURCE_ONLY |   PASS | logs/agnos-staff-list-test.log: 5 operatori con qualifica, source STAFF "5 operatori censiti"; clinical → redirect «Gestione struttura»; senza flag env → refusal (gate attivo) |
| AC5 build FE+BE verdi, unit verdi, suite verde                   |   PASS | backend `npm test` 352/352 (6 nuovi staff-list); `tsc -b && vite build` verde                                                                                                   |

## Test Results

| Test             | Result | Evidence                                                                                                                                                                                                                                                  |
| ---------------- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | staff-list.test.ts 6/6 (planner + agents ownership/redirect); suite 352/352                                                                                                                                                                               |
| Integration      |     NA | coperto da API + Playwright                                                                                                                                                                                                                               |
| API              |   PASS | logs/api-crud-test.log — POST 201, dup email 409, no-email 400, PUT, GET persistente                                                                                                                                                                      |
| Playwright       |   PASS | 1 passed (11.8s) — trace/trace.zip, playwright-report/, test-results/, video/                                                                                                                                                                             |
| Persistence      |   PASS | 2 reload nel test Playwright + verifica psql diretta su clinicos_test                                                                                                                                                                                     |
| Agnos AI         |   PASS | staff_list runtime via /ai/actions/plan (facility ok, clinical redirect, env-gate refusal)                                                                                                                                                                |
| Voice            |     NA | invariato                                                                                                                                                                                                                                                 |
| OCR              |     NA | non impattato                                                                                                                                                                                                                                             |
| Security/privacy |   PASS | staff_list gated canFacilityRead (senza flag → «Accesso non autorizzato»); nessun PHI paziente (solo dati organizzativi staff, no email/telefono via Agnos); /operators segue lo stesso modello di auth delle route admin esistenti; role-clamp invariato |

## Runtime Evidence

- `screenshots/operatori-qualifica-final.png` — tabella con operatore creato/modificato via UI
- `trace/trace.zip`, `video/operatori-qualifica.webm`, `playwright-report/`, `test-results/`
- `logs/api-crud-test.log`, `logs/agnos-staff-list-test.log`

## Logs

Sanitizzati: solo fixture sintetiche (SEED-_, e2e-1b-_@clinicos.demo). Nessun PHI reale.

## Residual Risks

- `colore` e `note` operatore restano client-side (contract: derivati/ephemeral) — la scelta colore
  dal form non sopravvive al reload (palette per indice, deterministica).
- Split nome/cognome da `User.fullName` al primo spazio: nomi propri composti ("Maria Grazia")
  finiscono nel cognome; il POST/PUT preserva comunque i valori inseriti nel form.
- In prod la migrazione è applicata da `prisma migrate deploy` nello startCommand Railway (additiva,
  nullable — nessun downtime).
- `AI_FACILITY_QUERIES_ENABLED=true` deve essere presente su Railway perché Agnos elenchi il personale
  (stesso flag già usato da rooms_occupancy).

## Final Decision

CLOSED — VERIFIED
