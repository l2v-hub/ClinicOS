# REQ-030 — Acceptance matrix

Issue: #34 — *Visualizzare Revisione e Scheda Paziente come sezioni testuali* (title REQ-030; body stale "REQ-026"). #35 (REQ-031) was an identical duplicate → closed as duplicate of #34.
Type: **Frontend**. Verified with Playwright screenshots (narrative-sections API mocked, model-independent).

| # | Acceptance criterion | Evidence | Status |
|---|----------------------|----------|--------|
| 1 | Diagnosis table removed from import review | REQ-027 ImportSectionsReview already renders text blocks (no table) | PASS |
| 2 | Diagnosis shown as a text block | `review-diagnosis-text.png` / `patient-narrative-sections.png` | PASS |
| 3 | No `Diagnosi (32)` count on the narrative section | section header shows only "Diagnosi" | PASS |
| 4 | Anamnesis text block | `review-anamnesis-text.png` (subtitles bold) | PASS |
| 5 | Hospital course text block | patient-narrative-sections (dates bold) | PASS |
| 6 | Consultations text block | narrative section | PASS |
| 7 | Imaging text block | narrative section | PASS |
| 8 | Procedures text block | narrative section | PASS |
| 9 | Therapy text block | `patient-edited-section.png` | PASS |
| 10 | Advice text block | narrative section | PASS |
| 11 | Sections editable | NarrativeClinicalSection edit mode (Modifica/Salva/Annulla/Ripristina) | PASS |
| 12 | Original newlines preserved | SemanticTaggedText `white-space: pre-wrap` | PASS |
| 13 | TAGs shown bold | `review-allergies-text.png` (Penicillina), anamnesis (subtitles/date) | PASS |
| 14 | Rendering never modifies original text | offset-only bold; no dangerouslySetInnerHTML (REQ-027 segments tests) | PASS |
| 15 | Source consultable | "Visualizza fonte" per section | PASS |
| 16 | Allergies visual priority | critical card, ALLERGY_CRITICAL red, first after anagrafica | PASS |
| 17 | Sections also in Scheda Paziente | `patient-narrative-sections.png` (Clinica → Sezioni Cliniche (testo)) | PASS |
| 18 | Empty sections manually fillable | `patient-empty-section.png` ("Nessuna informazione disponibile" + "Aggiungi informazioni") | PASS |
| 19 | No table auto-populated from import | narrative path (REQ-028/029) array-free; legacy tabs coexist separately | PASS |
| 20 | Desktop & tablet no overflow | `patient-narrative-sections.png` (1366) + `tablet-narrative-sections.png` (1024) | PASS |

## Shared component
`NarrativeClinicalSection` (props per spec: sectionKey,title,originalText,reviewedText,annotations,sources,critical?,editable) — single block, pre-wrap, offset bold, edit→reviewedText, restore original, source, modified/status badge, no `dangerouslySetInnerHTML`, no table. Used in the Scheda Paziente tab; the import review (REQ-027) already presents the same narrative blocks.

## Review-status states
Da revisionare / Revisionata / Modificata manualmente / Non presente nel documento / Conflitto da risolvere — shown as badges (`patient-narrative-sections.png` "DA REVISIONARE", `patient-edited-section.png` "MODIFICATA MANUALMENTE").

## Build / verification
- frontend `tsc -b` exit 0 + `vite build` ✓. segments safety tests 10/10 (REQ-027).
- screenshots desktop 1366 + tablet 1024. data-smoke /patients 200, 19.
