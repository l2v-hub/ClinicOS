# REQ-027 — Acceptance matrix

Issue: #28 — *Mappare le sezioni della lettera di dimissione nella cartella ClinicOS*
Type: **Frontend** (consumes REQ-026 `_sections`). Model-independent: the review is driven by canonical keys only; verified with a synthetic Imola fixture via network-mocked Playwright (no AI model in the loop).

| # | Acceptance criterion | Evidence | Status |
|---|----------------------|----------|--------|
| 1 | Anagrafica precompilata | `imola-patient-demographics.png` (form prefilled from `demographics`) | PASS |
| 2 | Allergie sempre visibili | `imola-allergy-critical.png` (priority card, always rendered) | PASS |
| 3 | Diagnosi un unico blocco | `imola-discharge-diagnosis.png` (multi-paragraph, one block) | PASS |
| 4 | Anamnesi un unico blocco | `imola-anamnesis-bold-tags.png` | PASS |
| 5 | Decorso nel Diario | `imola-hospital-course.png` (badge "Diario") | PASS |
| 6 | Consulenze nel Diario | `imola-consultations.png` | PASS |
| 7 | Diagnostica per immagini nel Diario | `imola-imaging.png` | PASS |
| 8 | Prestazioni e interventi nel Diario | `imola-procedures.png` | PASS |
| 9 | Terapia ospedaliera/domiciliare distinte | distinct cards (HOSPITAL_THERAPY vs DISCHARGE_HOME_THERAPY) | PASS |
| 10 | Terapia domiciliare conserva testo originale | `imola-home-therapy.png` (incomplete row shown integrally) | PASS |
| 11 | Consigli e controlli integrali | `imola-advice-follow-up.png` | PASS |
| 12 | Frontend usa TAG canonici | `sectionMapping.ts` keys off SectionKey enum only | PASS |
| 13 | Frontend non cerca titoli del documento | no document-title strings in FE logic (SECTION_MAP by key) | PASS |
| 14 | Date in grassetto | DATE annotations bold (segments test + screenshots) | PASS |
| 15 | Sottotitoli anamnesi in grassetto | SUBSECTION_TITLE bold (`imola-anamnesis-bold-tags.png`) | PASS |
| 16 | Righe farmacologiche incomplete leggibili | incomplete med row → full `exactText` shown | PASS |
| 17 | Ogni sezione mostra la fonte | "Fonte: …— pagina N" on every card | PASS |
| 18 | Testo originale non sovrascritto | save keeps `rawText`; edits go to separate `reviewedText` | PASS |
| 19 | Paziente creato solo dopo conferma | confirm only on "Crea paziente" (no record before) | PASS |
| 20 | Conflitto allergie blocca la conferma | FE ack gate + backend `isConfirmBlocked` (REQ-026) | PASS |
| 21 | UI non usa HTML del modello | no `dangerouslySetInnerHTML`; offset-only bold (segments test) | PASS |
| 22 | Comportamento indipendente dal modello | review driven by canonical contract, not by model output shape | PASS |

## Mandatory tests → coverage
- Pure rendering safety (`segments.test.ts`, 10 tests, all PASS): exact-text reconstruction, DATE/SUBSECTION bold, wrong-offset ignored, overlap resolution, illegible highlight, ALLERGY_CRITICAL class, no-HTML.
- Visual scenarios (Playwright fixture, all 11 screenshots): demographics prefill, multi-paragraph diagnosis, anamnesis subtitles, course/consultations/imaging/procedures dates, hospital vs home therapy, partially-illegible home-therapy line, advice, allergy present/critical, unmapped content preserved.

## Save / safety
`cartella.documentSections[]` persists `rawText` + `reviewedText` (separate) + `annotations` + `sources` + `reviewStatus`. Confirm is transactional + idempotent (REQ-018). Allergy conflict → `confirmAllergyConflict` required; backend blocks silent save (REQ-026).

## Data-smoke (regression)
GET /patients → 200, 19 patients (unchanged; frontend-only change).
