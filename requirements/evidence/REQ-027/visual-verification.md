# REQ-027 — Visual verification

**Result: PASS.** All 11 mandatory screenshots produced at desktop (1366×768) plus a tablet (1024×768) final-review, by driving the real SPA review surface with a synthetic Imola `_sections` fixture injected via network mocking. This is model-independent — it exercises exactly the frontend mapping/rendering REQ-027 specifies, regardless of which AI model the backend uses.

## Screenshots (`requirements/evidence/REQ-027/`)
- `imola-patient-demographics.png` — Anagrafica form prefilled (Mario Bianchi, DOB, CF, indirizzo…).
- `imola-allergy-critical.png` — priority allergy card, "ALLERGIE RILEVATE", **Penicillina** bold + red (ALLERGY_CRITICAL).
- `imola-discharge-diagnosis.png` — single faithful multi-paragraph block.
- `imola-anamnesis-bold-tags.png` — subtitles + date bold (SUBSECTION_TITLE, DATE), one block.
- `imola-hospital-course.png` — Diario badge, three dates bold, sequence preserved.
- `imola-consultations.png` / `imola-imaging.png` / `imola-procedures.png` — Diario blocks with dates bold.
- `imola-home-therapy.png` — priority card; med table; **incomplete `[ILLEGGIBILE]` row shown integrally** (no info lost); illegible token highlighted.
- `imola-advice-follow-up.png` — single block, "30 giorni" bold (TEMPORAL_MARKER).
- `imola-final-review.png` — full modal: stepper, all section cards, target-area badges, accept/modify/exclude/source controls, unmapped content preserved, Crea paziente.
- `imola-final-review-tablet.png` — tablet viewport.

## Reviewer notes (all PASS)
- Bold applied via offset annotations only; the exact text is preserved verbatim (no HTML, no `dangerouslySetInnerHTML`).
- Newlines preserved (`white-space: pre-wrap`); text selectable/copyable.
- Provenance ("Fonte: lettera-dimissione.pdf — pagina N") on every section.
- Sections render in the ClinicOS target areas via canonical keys; the frontend never matches document titles.

## Note on live data
`_sections` is produced by REQ-026's opt-in backend pass (`AI_SECTIONS_PASS`, default OFF). The fixture-driven Playwright run is the faithful, deterministic verification of the frontend contract; enabling the live pass in prod is a backend env toggle (user/runtime action) and does not change the frontend behaviour shown here.
