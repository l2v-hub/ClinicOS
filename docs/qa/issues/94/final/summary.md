# BUG-056 / #94 — Terapia: lo stesso farmaco deve supportare più orari

## Root cause

`TerapiaFarmacologicaTab.tsx` rendered a SINGLE `<input type="time">` for `orarioSpecifico`,
so an operator had to create duplicate prescriptions to give one drug at multiple times. The
Prisma field `PatientTherapy.orarioSpecifico` is already a comma-separated list — only the UI
was single-valued.

## Fix (frontend-only)

Replaced the single time input with a multi-time editor: add ("+ Aggiungi orario") / remove (✕)
individual times, stored as CSV in `orarioSpecifico`. Payload sanitises (trim + drop empties).
Active-therapy table now renders one chip per time. No backend change (schema already CSV).

## Verification (local E2E)

`e2e/verify-94-multiorari.mjs` → `{ timeInputCount: 3, rowCount: 1, orarioSpecifico: "08:00,14:00,20:00", allThreeTimes: true }`
i.e. one prescription with 3 times, **no duplicate row**, persisted (confirmed via API), then cleaned up.

## Acceptance criteria

- [x] Aggiunta di più orari
- [x] Rimozione singolo orario (✕ per riga)
- [x] Persistenza dopo refresh (API conferma 1 riga con CSV)
- [x] Nessuna duplicazione prescrizione (rowCount=1)
- [x] Test con 3 orari (e ≥2)
- [~] Eventi di somministrazione distinti — gli orari specifici alimentano gli slot esistenti
  (fasce + orarioSpecifico); generazione eventi invariata lato backend.

Build: `npm run build:frontend` PASS.
