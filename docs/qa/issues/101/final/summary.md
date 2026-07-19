# BUG-063 / #101 — Anamnesi: vengono mostrate sempre le stesse allergie

## Root cause (patient-safety bug)

`frontend/src/mockData.ts > createDefaultCartella()` returned a fully-populated DEMO cartella with
hardcoded allergie (Penicillina / FANS / Lattice), plus demo diagnosi, farmaci, parametri, anamnesi.
This function is the fallback in `App.tsx` `getCartella()` / `loadCartella()` / `updateCartella()`
for ANY patient whose backend cartella is empty (seed patients have `data: null`). Result: every
patient showed the SAME fabricated allergie (and diagnosi/farmaci/parametri). Worse, on first edit
the fabricated default was PERSISTED into that patient's real cartella.

## Fix (frontend-only)

`createDefaultCartella()` now returns an EMPTY cartella (empty arrays, empty anamnesi, empty text).
Real backend data still merges over this base in `loadCartella`. No fabricated clinical data is ever
shown or written. No backend change.

## Verification (local)

- `npm run build:frontend` PASS.
- Untouched patient **Mancini** Anamnesi → "Nessuna allergia registrata" (screenshot `after-mancini.png`);
  `e2e/shot-cartella-card.mjs … "Penicillina"` → `hasScrollTo:false` (fabricated allergy absent).
- Patient **Moretti** had been contaminated by earlier edits under the buggy default
  (API showed `['Penicillina','FANS (Ibuprofene)','Lattice']`); reset her cartella, re-verified
  `hasScrollTo:false`.

## Note for cleanup

Any patient EDITED under the old buggy code may have the fabricated clinical data persisted in their
backend cartella. Those stale records should be cleaned (reset cartella) — the code fix prevents new
contamination but does not retroactively scrub already-saved rows.

## Acceptance criteria

- [x] Allergie riflettono il singolo paziente (non più hardcoded condivise)
- [x] Pazienti diversi → allergie diverse / vuote reali
- [x] Nessun dato clinico fabbricato mostrato o salvato
