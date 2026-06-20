# BUG-051 — Acceptance matrix

Issue: #73 — *Blocchi narrativi presenti ma contenuto importato non popolato*
Chain under test: `AI raw/markdown → parser sezioni → draft narrativo → DTO backend → stato frontend → NarrativeClinicalSection`

| # | Acceptance criterion | Verification method | Where | Initial | Final | Evidence |
|---|----------------------|---------------------|-------|---------|-------|----------|
| 1 | Anamnesi apre l'editor già popolato | Unit/integration: `parseNarrativeFromMarkdown(## Anamnesi Patologica Recente:)` → `ANAMNESIS.originalText` non vuoto; editor init = `displayText = reviewedText ?? originalText` | `markdown-parse.ts`, `patient-narrative.ts`, `NarrativeClinicalSection.tsx:68,73` | already populated for recognised headings | **PASS** | `markdown-parse.test.ts` "anamnesis fixture populates ANAMNESIS.originalText through to the row" |
| 2 | Diagnosi e Terapia sono popolati | Integration: rows for DIAGNOSIS/THERAPY carry `originalText` | `narrativeDraftToSectionRows` | partially | **PASS** | same test + existing `patient-narrative.test.ts` therapy/diagnosis tests |
| 3 | La fonte resta collegata | `sourceReferences` routed per section (unchanged path) | `narrative.ts buildField`, `patient-narrative.ts` | working | **PASS (no regression)** | existing `patient-narrative.test.ts` annotation/source routing |
| 4 | Salvataggio e refresh mantengono il contenuto | `originalText` immutable on upsert; `displayText` resolves on read | `patient-narrative.ts upsertNarrativeSection:134-138` | working | **PASS (no regression)** | existing tests + manual code review |
| 5 | Editor init = `reviewedText ?? originalText ?? ""` | Code review: `startEdit(){ setDraft(displayText) }`, `displayText = reviewedText.trim() ? reviewedText : originalText` | `NarrativeClinicalSection.tsx:68,73` | already satisfied | **PASS** | source line ref |
| 6 | Funzione idempotente per ricostruire il draft (no AI) | Code review: `rebuildNarrativeDraftFromExistingExtraction` self-heals on read, no AI call | `job-service.ts:755-790` | already satisfied | **PASS** | source line ref |
| 7 | **Bloccare il salvataggio** se sezione rilevata con testo non vuoto arriva con `originalText` vuoto | NEW guard wired into confirm; throws `AiExtractionError`/`NarrativeSectionContentLostError` | `confirm-service.ts` (guard), `markdown-parse.ts assertNoNarrativeSectionLoss` | **MISSING** | **PASS (implemented)** | `markdown-parse.test.ts` guard tests (throws on loss, passes on faithful, no false-positive on unstructured) |
| 8 | Test E2E con `## Anamnesi Patologica Recente:` | Deterministic parser→rows test using the exact fixture | `markdown-parse.test.ts` | absent | **PASS (unit/integration)**; browser E2E **BLOCKED** (deploy) | see Notes |

## Build & tests
- backend `npm test`: 161/162 pass — the 1 failure (`voice.test.ts:119` "execute: double confirmation does NOT duplicate", REQ-041) is **pre-existing on `main`** (reproduced with BUG-051 changes stashed); unrelated to this issue.
- BUG-051 tests added: **16/16 pass** in `markdown-parse.test.ts`.
- backend `npm run build`: **PASS** (prisma generate + tsc).
- frontend `npm run build`: **PASS** (tsc -b + vite build).

## Notes / blocked items
- **Deploy + browser E2E verification BLOCKED**: GitHub Actions is hard-blocked at the account level — every workflow fails at job-start with *"recent account payments have failed or your spending limit needs to be increased"* (Railway backend deploy, Azure SWA frontend deploy, AI Import E2E gate). Per the mandatory deploy rule the issue cannot be closed until a deploy starts. Pending billing fix.
- Root cause was already largely mitigated in committed code (REQ-035 markdown parse + self-heal rebuild); the issue's production evidence is consistent with **prod running a stale build** that never deployed because Actions was billing-blocked. The genuine remaining code gap — the confirm-time save-block guard (criterion 7) — is now implemented.
