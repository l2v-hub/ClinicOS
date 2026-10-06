---
name: clinicos-consistent-section-controls
description: User preference for consistent section headers and collapse controls across ClinicOS
metadata:
  node_type: memory
  type: preference
---

The user explicitly requires the same UX/UI for equivalent interactions throughout ClinicOS. Reuse the existing shared component instead of creating a different local visual pattern.

For expandable clinical cards, the reference is **Dati di ingresso**: `ClinicalCard`, title on the left, text action **Modifica** on the right, then the compact SVG chevron button. Anagrafica and Contatti use this same component. Preserve keyboard operation, `aria-expanded`, `aria-controls`, and the page-wide open/close controls through `useWidgetOpen`.

Clicking **Modifica** must expand a collapsed card so its editor is visible. Toggling a card must retain unsaved editor data. Compact sizing comes from shared design tokens, including tablet touch targets.

When changing an equivalent control elsewhere, compare it with this reference and reuse the shared behavior and styling. Do not introduce a second collapse icon or a larger local button style.

For the **Clinica** area, the user's reference is the imported **Allergie** block: a compact `ds-icon-btn` on the left with the same ▸/▾ glyphs. `SectionToggle` is shared by `ClinicalTableSection` and `NarrativeClinicalSection`; diagnoses, risks, allergies, anamnesis and other CTS widgets must use it rather than a bare triangle or a clickable header with nested button semantics. Header actions expand a closed section to reveal their editor. Keep count badges and source/review actions separate from the toggle.
