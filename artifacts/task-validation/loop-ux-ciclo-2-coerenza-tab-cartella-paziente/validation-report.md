# Task Validation Report

## Task
- Title: Loop UX ciclo 2: coerenza tab cartella paziente
- Slug: loop-ux-ciclo-2-coerenza-tab-cartella-paziente
- Commit:
- Date: 2026-08-06

## Implementation Summary

- `cartella/shared.tsx`: nuovo `LoadingState({ msg = 'Caricamento…' })`, riusa la classe CSS
  `cr-empty-inline` già esistente (nessun nuovo CSS).
- `DiarioPazienteTab.tsx`: loading state + empty state ("Nessuna voce nel diario.") sostituiti coi
  componenti condivisi.
- `TerapiaFarmacologicaTab.tsx`: 5 blocchi loading inline sostituiti con `<LoadingState />`
  (uno con `msg="Caricamento storico…"`); rimossa la propria definizione locale di `API_URL`.
- **Bug fix API_URL**: `config.ts` reso sicuro sotto `node:test` (lettura difensiva di
  `import.meta.env`, stesso pattern già usato dalle copie locali). Rimosse le 7 reimplementazioni
  locali duplicate (`useAnomalieReparto.ts`, `TerapiaFarmacologicaTab.tsx`, `CampoFarmaco.tsx`,
  `RicercaFarmaco.tsx`, `farmacoRiferimento.ts`, `InvioPSModal.tsx`, `intakeDraftApi.ts`), tutte
  ora importano `API_URL` da `config.ts`.

## Files Changed

- `frontend/src/config.ts`
- `frontend/src/components/operator/cartella/shared.tsx`
- `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx`
- `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`
- `frontend/src/components/operator/cartella/useAnomalieReparto.ts`
- `frontend/src/components/operator/cartella/CampoFarmaco.tsx`
- `frontend/src/components/operator/cartella/RicercaFarmaco.tsx`
- `frontend/src/components/operator/cartella/farmacoRiferimento.ts`
- `frontend/src/components/operator/InvioPSModal.tsx`
- `frontend/src/components/shared/intake/intakeDraftApi.ts`

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 (LoadingState condiviso) | PASS | Verificato nel diff: 6 blocchi inline duplicati in Diario/Terapia sostituiti; `EmptyState` riusata anche per l'empty-state adiacente in Diario. |
| AC2 (unica fonte API_URL) | PASS | `grep -rl "VITE_API_URL" frontend/src` → solo `config.ts` fuori dai test; le altre 7 copie rimosse e sostituite da un import. |
| AC3 (config.ts sicuro sotto node:test) | PASS | `npm test` (frontend, node:test-based) → 132/132 verdi dopo il cambio, incl. moduli che ora importano `config.ts` transitivamente. |
| AC4 (bug risolto, nessuna regressione visiva) | PASS | Verificato dal vivo (Postgres di test reale): prima del fix, richiesta a `http://localhost:5173/patients/:id/therapies` (origine sbagliata, HTML invece di JSON) e banner d'errore visibile nella tab Terapia Farmacologica; dopo il fix, stessa richiesta va a `http://localhost:3001/...`, 200, nessun banner d'errore. Screenshot Diario (6 voci, invariato) e Terapia Farmacologica (0 farmaci attivi, corretto per questo paziente demo) confermano nessuna regressione visiva. |
| AC5 (build/tsc/test puliti) | PASS | `cd frontend && npx tsc --noEmit` → 0 errori. `npm run build` → verde. `npm test` → 132/132. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | `npm test` (frontend) 132/132, nessuna regressione dal refactor `API_URL`/`LoadingState`. |
| Integration | NA | |
| API | NA | Nessuna route backend toccata. |
| Playwright | PASS | Script ad-hoc (non committato): navigazione a Forlano, Fabio → Diario (screenshot, 6 voci) → Clinica → Terapia Farmacologica (screenshot, prima con errore JSON riprodotto, poi senza dopo il fix); log di rete conferma il cambio di origine delle chiamate (5173→3001). |
| Persistence | NA | |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | NA | |
| Security/privacy | NA | Nessun nuovo secret/endpoint esposto; il fix riduce solo la superficie di codice duplicato. |

## Runtime Evidence

Rivalidato il 2026-08-06 contro lo stesso Postgres Railway di test riutilizzato in questa sessione
(usa-e-getta, non produzione), con backend (`:3001`) e frontend (`:5173`, `vite` dev server senza
`VITE_API_URL` impostata — il caso esatto che riproduce il bug) avviati dal vivo. Riprodotto il bug
(richiesta a `http://localhost:5173/patients/<id>/therapies`, 200 ma corpo HTML, errore di parsing
visibile in UI), applicato il fix, rieseguita la stessa navigazione: tutte le chiamate ora verso
`http://localhost:3001/...`, nessun errore.

## Logs

Nessun dato clinico in log. Solo URL/status delle richieste di rete (script di verifica, non
committato) e output build/test.

## Residual Risks

- Il bug era mascherato in produzione (Vercel imposta `VITE_API_URL`) e in CI (i workflow la
  impostano esplicitamente) — la correzione previene una landmine futura (es. variabile Vercel
  rimossa per errore) più che un problema visibile oggi in produzione.
- `LoadingState`/`EmptyState` non estesi a `NarrativeSectionsTab.tsx`/`EsamiConsulenzeTab.tsx` per
  scelta (contesti genuinamente diversi, vedi Risks nel contract) — non un lavoro rimandato per
  mancanza di tempo, ma una decisione di scope.

## Final Decision

CLOSED — VERIFIED
