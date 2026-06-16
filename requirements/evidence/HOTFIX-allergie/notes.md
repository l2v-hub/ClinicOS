# HOTFIX — cartella.allergie.filter is not a function (prod crash)

## Cause
REQ-027 narrative-import confirm wrote `cartella.allergie = { status, rawText, acknowledged }`
(object). The patient record expects `allergie: Allergy[]`; `getCartella` spread the backend
`data` over defaults, so any patient imported since then had `allergie` as an object →
`cartella.allergie.filter(...)` threw and crashed the whole Patient detail page.

## Fix
1. `App.tsx loadCartella`: after merging backend data over defaults, coerce any clinical-list
   field that is NOT an array back to its default `[]` (heals already-imported patients on read).
2. `ImportSectionsReview` confirm: stop writing `cartella.allergie` (object) — moved to
   `_allergyNarrative`; the structured `allergie[]` field is left untouched.

## Verified
Playwright: a patient whose cartella has `allergie`/`diagnosi` as OBJECTS now renders the
detail with **0 TypeErrors** (`patient-detail-recovered.png`). frontend `tsc -b` + `vite build` ✓.
