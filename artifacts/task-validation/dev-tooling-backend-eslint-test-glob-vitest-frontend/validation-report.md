# Task Validation Report

## Task

- Title: Dev tooling — backend ESLint, test discovery runner, frontend test runner
- Slug: dev-tooling-backend-eslint-test-glob-vitest-frontend
- Commit: (push in corso)
- Date: 2026-07-19

## Implementation Summary

Automazioni di tooling (nessun impatto runtime). Parte del pacchetto "voci 1–7"; qui le sole
modifiche sotto `backend/`/`frontend/` che richiedevano il Quality Gate:

1. **Backend ESLint** — nuovo `backend/eslint.config.js` (flat, `typescript-eslint` recommended,
   globals Node). Script `lint` aggiunto (`eslint .`). Regole pragmatiche per un backend che
   adotta ESLint per la prima volta: `no-unused-vars`/`no-useless-escape` a `warn`,
   `no-explicit-any` off (runtime AI/OCR). Baseline: **0 errori, 28 warning**.
2. **Test discovery runner** — `scripts/run-node-tests.mjs`: scopre ricorsivamente `src/**/*.test.ts`
   e li esegue via `node --import tsx --test`. Sostituisce la lista di ~33 file scritta a mano nel
   `test` del backend (fragile). Motivo tecnico: su Node 20 né `node --test` né `tsx` espandono i
   glob posizionali (supporto glob da Node 21), quindi un `tsx --test "src/**/*.test.ts"` non
   trovava nulla — il runner genera la lista esplicita, cross-platform.
3. **Frontend test runner** — `frontend` `test` = stesso runner. Scelta **node:test via tsx**
   (coerente col codebase: backend + 12 file `__tests__` frontend già scritti in `node:test`),
   **non Vitest**: Vitest avrebbe orfanato quei 12 file (import `node:test` non bundlabile). Il
   frontend non aveva alcun runner → questi 12 file erano dormienti; ora girano.

## Files Changed

- `backend/eslint.config.js` (nuovo)
- `backend/package.json` (`scripts.lint`, `scripts.test` → runner; devDeps eslint/@eslint/js/typescript-eslint/globals)
- `frontend/package.json` (`scripts.test` → runner; devDep tsx; rimosse vitest/jsdom)
- `scripts/run-node-tests.mjs` (nuovo, root)

## Acceptance Criteria Result

| AC                                                                      |          Result | Evidence                                                                                                                        |
| ----------------------------------------------------------------------- | --------------: | ------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — `npm run lint -w backend` esegue ESLint senza crash di config     |            PASS | exit 0; `logs/backend-eslint.txt` → "28 problems (0 errors, 28 warnings)"                                                       |
| AC2 — backend test via discovery, nessun test perso vs lista precedente |            PASS | 336 pass / 0 fail (33 file listati → 36 file: +3 dormienti attivati: `intake-confirm`, `intake-draft`, `confirm-draft-therapy`) |
| AC3 — frontend `npm run test` esegue e almeno uno smoke verde           | PASS (superato) | 98 pass / 0 fail su 12 file `node:test` prima senza runner                                                                      |
| AC4 — build frontend e backend restano verdi                            |            PASS | backend build exit 0 (`logs/backend-build.txt`); frontend build exit 0, built 6.22s (`logs/frontend-build.txt`)                 |

## Test Results

| Test                                                 | Result | Evidence                                                                           |
| ---------------------------------------------------- | -----: | ---------------------------------------------------------------------------------- |
| Backend suite (`node ../scripts/run-node-tests.mjs`) |   PASS | tests 336 / pass 336 / fail 0                                                      |
| Frontend suite (idem)                                |   PASS | tests 98 / pass 98 / fail 0                                                        |
| Backend ESLint                                       |   PASS | exit 0, 0 errori                                                                   |
| Backend build (prisma generate + tsc)                |   PASS | exit 0                                                                             |
| Frontend build (tsc -b + vite)                       |   PASS | exit 0                                                                             |
| Prettier config risolve                              |   PASS | `prettier --check .prettierrc.json` → "All matched files use Prettier code style!" |

## Runtime Evidence

- `logs/backend-eslint.txt`, `logs/backend-build.txt`, `logs/frontend-build.txt`,
  `logs/backend-test-summary.txt`, `logs/frontend-test-summary.txt`.
- Nessuna UI runtime modificata → nessuno screenshot/trace Playwright richiesto (Test Plan: Playwright = no).

## Logs

Solo output di tooling (build/lint/test). Nessun PHI/segreto.

## Residual Risks

- **Frontend ESLint pre-esistente rosso** (App.tsx e vari componenti): debito legacy **non
  introdotto** da questo task (lo script `lint` frontend esisteva già). Per questo il pre-commit
  `lint-staged` è **solo Prettier** (non blocca i commit sul debito legacy); ESLint resta via
  `npm run lint` + CI, da ripulire incrementalmente.
- Le 28 warning backend (20 `no-useless-escape` + 6 `no-unused-vars` + 2) sono nit su regex/vars
  funzionanti in prod; declassate a warning, da ripulire quando conviene.
- Vitest rimosso: se in futuro servono test component/DOM, reintrodurre `vitest + jsdom` con un
  `include` che escluda i file `node:test`.

## Final Decision

CLOSED — VERIFIED

(Tooling: backend ESLint baseline pulita, runner di test cross-platform che sostituisce la lista
manuale e attiva 3+12 file di test dormienti, build verdi. Nessun impatto runtime.)
