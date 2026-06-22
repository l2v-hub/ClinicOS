# BUG-053 / #91 — Ingresso paziente: il dolore non è modificabile

## Root cause
In `PresaInCaricoTab.tsx`, the read view of the "Valutazione funzionale" card rendered **every**
field with `InlineEditableField` (click-to-edit) **except Dolore**, which used the read-only
`RowAlways`. So the pain value/level could not be corrected inline like the other fields.

## Fix (frontend-only)
`frontend/src/components/operator/cartella/PresaInCaricoTab.tsx`:
- Dolore → `InlineEditableField` (select Assente/Presente). Choosing **Assente** also resets the
  NRS level to 0 ("remove pain").
- When Dolore = Presente, an inline **Livello NRS (0–10)** field appears (number, clamped 0–10).
- Persistence is unchanged: `saveField` → `onUpdate({ presaInCarico })` → backend stores the
  `presaInCarico` JSON (already supported), so values survive refresh.

Backend: **no change required** (the field round-trips inside the existing `presaInCarico` blob).

## Acceptance criteria
- [x] Campo dolore editabile — inline select + NRS
- [x] Salvataggio valore e note — via `saveField`
- [x] Correzione prima e dopo il salvataggio — full-form edit + inline edit
- [x] Persistenza dopo refresh — E2E `persistedPresente: true`
- [x] Validazioni — NRS clamped 0–10; Assente forces level 0
- [x] E2E nuovo ingresso e modifica — `e2e/verify-91-dolore.mjs`

## Verification
- `npm run build:frontend` — PASS
- `e2e/verify-91-dolore.mjs` → `{ nrsRowAppeared: true, persistedPresente: true }`
  (edits the Dolore field inline, reloads, asserts the value persisted; restores Assente).
- Screenshots: `iteration-1/before.png`, `iteration-1/after-full.png`, `final/after.png`,
  `final/after-refresh.png`.
