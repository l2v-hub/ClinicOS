# Validation report — Issue #244 (Allergie: assenti / paziente nega / presenti)

**Final Decision: CLOSED — VERIFIED**

Ambiente: stack locale reale — Postgres (Podman) + backend `:3001` (DB seeded) + frontend `:5173`, codice PR #247 branch `fix/issue-244-allergie` sovrapposto al tree in esecuzione (HMR). Paziente sintetico: **Moretti, Elena** (SEED-PAZ-008). Data: 2026-07-09.

## Esito acceptance criteria (Playwright UI reale — 9/9 PASS)

| AC | Esito | Evidenza |
|----|-------|----------|
| AC1 — stato "assenti" salvato in modo chiaro | ✅ | badge `allergy-none` "Allergie assenti — verificato dall'operatore"; PUT `/patients/:id/cartella` → 200 · `screenshots/after-assenti.png` |
| AC2 — stato "paziente nega" salvato | ✅ | badge `allergy-denied` "Paziente nega allergie"; PUT → 200 · `screenshots/after-nega.png` |
| AC3 — allergie presenti non sovrascritte | ✅ | stato "presenti" selezionabile, `aria-checked=true`; il dettaglio è mantenuto al cambio stato (per design l'editor conserva la lista) |
| AC4 — persistenza dopo reload | ✅ | "paziente nega" e "assenti" restano dopo `page.reload()` + riapertura scheda · `screenshots/after-refresh-nega.png`, `after-refresh-assenti.png` |
| Privacy/log | ✅ | nessun console error; nessun dato sensibile nei log (`logs/console-errors.log` vuoto) |

## Note
- Selettore 3-stati `data-testid="allergy-status"` (radiogroup) con opzioni `allergy-status-{presenti,assenti,paziente_nega}`.
- Persistenza via `onUpdateCartella` → PUT `/patients/:id/cartella` (blob `Cartella.data`), nessuna migration.
- Toast "Dati salvati correttamente" visibile dopo ogni salvataggio.

## Artefatti
`screenshots/` (before, after-nega, after-refresh-nega, after-assenti, after-refresh-assenti, after-presenti) · `trace/trace.zip` · `video/*.webm` · `logs/console-errors.log` · `ui-report.json` · test: `e2e/issue-244-allergie.mjs`.

Claude non chiude, non mergia, non deploya. Codex resta l'unico QA Gatekeeper.

## Codex final gate — 2026-07-12

| Check | Result | Evidence |
|---|---:|---|
| Acceptance criteria | PASS | Three allergy states and contradiction guard verified |
| Code review | PASS | PR #249 integrated through verified PR #257 |
| Tests | PASS | Allergy model tests and integrated gate #256 |
| Playwright | PASS | Integrated scenario #244 PASS |
| Runtime validation | PASS | Combined stack validation #256 |
| Persistence | PASS | State persists after reload |
| Privacy/security | PASS | Synthetic evidence; no sensitive logs |
| Evidence complete | PASS | Issue artifact plus integrated #256 bundle |
| Final decision | CLOSED — VERIFIED | Integrated release candidate verified |
