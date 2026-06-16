# REQ-035 — Visual verification

**Result: PASS.**

- `anamnesis-card-with-preview.png` — Anamnesi card shows the extracted text (not just title/source).
- `anamnesis-edit-prefilled.png` — **Modifica editor prefilled** with `## Anamnesi Patologica Recente:\n\nInviata in PS in data 09/03...` plus `## Anamnesi Patologica Remota: ...` in the SAME block; "Testo originale (non sovrascritto)" + source available.
- `anamnesis-full-text.png` / `anamnesis-source-compare.png` — full text + source compare.
- `diagnosis-edit-prefilled.png` / `therapy-edit-prefilled.png` — diagnosis/therapy editors prefilled.

E2E asserts (passed): card contains "Inviata in PS in data 09/03"; editor value starts with
"## Anamnesi Patologica Recente:"; includes the Remota subtitle. No AI re-run. Synthetic fixture.
