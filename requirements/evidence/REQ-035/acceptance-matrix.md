# REQ-035 — Acceptance matrix

Issue: #43 — *Popolare realmente i blocchi narrativi con il testo estratto* (BLOCKER; title REQ-035, commit "REQ-029" stale).
Type: **Backend (parser/mapping) + Frontend (source selection)**. No new AI call.

| # | Acceptance criterion | Evidence | Status |
|---|----------------------|----------|--------|
| 1 | Anamnesi card contains the extracted text | `anamnesis-card-with-preview.png`; E2E assert | PASS |
| 2 | Modifica → textarea already filled | `anamnesis-edit-prefilled.png`; assert startsWith heading | PASS |
| 3 | Text starts with `## Anamnesi Patologica Recente:` | E2E assert true | PASS |
| 4 | All following text preserved | parser keeps content to next canonical heading | PASS |
| 5 | Anamnesi subtitles in one block | `markdown-parse.test.ts` "subtitles merge"; editor shows Remota too | PASS |
| 6–13 | Diagnosi/Decorso/Consulenze/Diagnostica/Prestazioni/Terapia/Consigli/Allergie contain extracted text | parser maps each; `diagnosis/therapy-edit-prefilled.png`; parser tests | PASS |
| 14 | Text not summarised | verbatim accumulation; headings kept | PASS |
| 15 | Text not turned into rows | narrative *Text strings only | PASS |
| 16 | Source stays linked | source line + Confronta con la fonte (`anamnesis-source-compare.png`) | PASS |
| 17 | Accetta doesn't delete content | ImportSectionsReview keeps rawText; reviewedText only on modify | PASS |
| 18 | Escludi doesn't delete originalText | excluded status only; rawText kept | PASS |
| 19 | Refresh doesn't empty sections | persisted resultData + self-heal in getJobResult | PASS |
| 20 | Scheda Paziente shows saved text | confirm persists `_narrative`→PatientNarrativeSection (REQ-029); now populated | PASS |
| 21 | No new AI call to rebuild | `parseNarrativeFromMarkdown` / `rebuildNarrativeDraftFromExistingExtraction` are pure | PASS |

## Implementation (no duplicate extraction)
- `markdown-parse.ts`: `parseMarkdownSections`, `parseNarrativeFromMarkdown`, `detectSectionLoss` (NARRATIVE_SECTION_CONTENT_LOST guard).
- `runJob`: `_narrative` built from `rawText` markdown (fallback to sections pass / rawText). `getJobResult` + idempotent `rebuildNarrativeDraftFromExistingExtraction` self-heal old jobs.
- Frontend `DischargeImportModal`: `effectiveSections` prefers the source that carries section text.

## Tests
- `markdown-parse.test.ts` 11 (markdown/plain headings, subtitle merge, end-at-next-canonical, newlines, lists, multi-page, imaging-not-swallowed, allergies, missingSections, detectSectionLoss). backend 96/96. frontend 14/14. `tsc` x2 + `vite` ✓.
- E2E: editor prefilled with `## Anamnesi Patologica Recente:` + Remota subtitle.

## Data-smoke
GET /patients 200, 19.
