# REQ-030 — Visual verification

**Result: PASS.** Scheda Paziente narrative sections captured at desktop (1366×768) + tablet (1024×768), driving the real SPA with the REQ-029 narrative-sections API mocked (model-independent).

Screenshots (`requirements/evidence/REQ-030/`):
- `patient-narrative-sections.png` — Clinica → "Sezioni Cliniche (testo)": Allergie (critical, Penicillina red), Diagnosi as one faithful block (no table, no count), Anamnesi (bold subtitles + date), Decorso (bold dates), Consulenze empty → "Nessuna informazione disponibile" + "Aggiungi informazioni". Legacy tabs (Diagnosi 2, Terapia 4) coexist as separate secondary areas.
- `patient-empty-section.png` — empty section state.
- `patient-edited-section.png` — Terapia "MODIFICATA MANUALMENTE" showing reviewedText (operator note appended; original preserved).
- `review-diagnosis-text.png` / `review-allergies-text.png` / `review-anamnesis-text.png` — narrative blocks with bold tags.
- `tablet-narrative-sections.png` — tablet, no overflow.

Reviewer notes: bold via offset annotations only; newlines preserved; no `dangerouslySetInnerHTML`; allergies prioritised; source available; review-status badges present. No fabricated data — synthetic Imola fixture.
