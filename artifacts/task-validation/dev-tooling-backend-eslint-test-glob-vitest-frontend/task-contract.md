# Task Contract

## Task
- Title: Dev tooling backend eslint test-glob vitest frontend
- Slug: dev-tooling-backend-eslint-test-glob-vitest-frontend
- Type: refactor
- Date: 2026-07-19

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | yes |

## Current Behaviour

Dev-tooling gap, non runtime. Il backend non ha ESLint (nessuna config, nessuno script `lint`);
lo script `test` del backend elenca ~40 file `.test.ts` **a mano** (fragile: un nuovo test non
listato non gira → falso verde). Il frontend non ha test runner (nessuno script `test`, solo
Playwright). Nessun impatto sul comportamento applicativo a runtime: si tocca solo config di
tooling (ESLint, glob dei test, Vitest) sotto `backend/`/`frontend/`.

## Expected Behaviour

- `backend/` ha `eslint.config.js` (flat, typescript-eslint) + script `lint`; `npm run lint -w backend` gira.
- `backend` `test` usa un **glob** (`tsx --test 'src/**/*.test.ts'`): ogni test viene raccolto senza lista manuale.
- `frontend/` ha Vitest (`vitest.config.ts`, ambiente jsdom) + script `test` + almeno uno smoke test verde.
- Nessuna modifica a codice runtime, API, Prisma, env applicativi. Build frontend e backend restano verdi.

## Acceptance Criteria

- AC1: `npm run lint -w backend` esegue ESLint sul backend senza crash di configurazione (0 errori di config).
- AC2: `npm run test -w backend` raccoglie i test via glob e passa la suite esistente (nessun test perso vs lista precedente).
- AC3: `npm run test -w frontend` esegue Vitest e almeno uno smoke test è verde.
- AC4: `npm run build -w frontend` e `npm run build -w backend` restano verdi (nessuna regressione di build).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Backend test-suite via nuovo glob + smoke test Vitest frontend |
| Integration | no | Nessun flusso integrato toccato |
| API | no | Nessun endpoint toccato |
| Playwright | no | Nessuna UI runtime modificata (solo config test) |
| Persistence after refresh | no | Nessun dato creato/modificato |
| Agnos action registry | no | Non impattato |
| Voice simulation | no | Non impattato |
| OCR/import test | no | Non impattato |
| Security/privacy scan | no | Solo devDependencies di tooling, nessun PHI/segreto |

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

- Il glob dei test backend potrebbe raccogliere test non previsti/rotti: mitigazione — confronto conteggio test vs lista precedente, la suite deve restare verde.
- Nuove devDependencies (eslint backend, vitest) potrebbero alterare l'install: mitigazione — install workspace-aware `-w`, build ri-verificata dopo.
- Nessun impatto su runtime/API/Prisma: cambi confinati a config di tooling.

## Gate Status

READY FOR IMPLEMENTATION
