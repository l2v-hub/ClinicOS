# REQ-029 — Acceptance matrix

Issue: #33 — *Aggiungere sezioni narrative permanenti alla Scheda Paziente* (title REQ-029; body stale "REQ-025").
Type: **Backend / data-model** (no UI). Verified by unit tests + post-deploy read-only API smoke. Migration is additive (new table) — auto-applied on Railway deploy.

| # | Acceptance criterion | Evidence | Status |
|---|----------------------|----------|--------|
| 1 | Persistent model for narrative sections | `PatientNarrativeSection` (Prisma) + migration `20260616080000_add_patient_narrative_sections` | PASS |
| 2 | Each section has original + reviewed text | `originalText` (TEXT) + `reviewedText` (TEXT) columns | PASS |
| 3 | All patients can show canonical sections | `getNarrativeSections` DTO returns all 10 keys (empty when absent) | PASS |
| 4 | Sections fillable manually | PUT/PATCH `upsertNarrativeSection` (seeds originalText on manual create) | PASS |
| 5 | Imported sections keep the source | `sourceReferences` JSONB persisted from draft | PASS |
| 6 | originalText never overwritten | upsert `update` clause omits originalText; test `displayText`/immutability | PASS |
| 7 | Annotations preserved | `annotations` JSONB; test "annotations routed by key" | PASS |
| 8 | Creation transactional | `persistNarrativeFromDraft` runs inside the confirm `$transaction` | PASS |
| 9 | Existing structured data not deleted | coexists; confirm still writes Cartella; no deletes added | PASS |
| 10 | Import generates no diagnosis rows | narrative path (REQ-028) is array-free; sections store TEXT only | PASS |
| 11 | Import generates no therapy rows | same — `therapyText` is one block | PASS |
| 12 | Refresh shows saved text | DTO `displayText = reviewedText ?? originalText` (persisted) | PASS |

## API (mounted at /patients)
- `GET /patients/:id/narrative-sections` → all 10 canonical sections (empty + reviewStatus `absent` when none).
- `GET /patients/:id/narrative-sections/:sectionKey`
- `PUT|PATCH /patients/:id/narrative-sections/:sectionKey` → saves `reviewedText` (+ optional manual `originalText` seed); never overwrites an existing `originalText`.

## Tests (`backend/src/ai/__tests__/patient-narrative.test.ts`, 7) + full suite 85/85
10 keys + Italian titles · displayText reviewed-vs-original · draft→rows mapping (diagnosisText→DIAGNOSIS, no arrays) · empty→absent · annotations routed by key · allergy conflict/unclear→`conflict` · therapy combined block. `tsc` exit 0, `prisma generate` OK.

## Safety
Additive table; legacy structured data (diagnosi/terapie/note) untouched. originalText immutable. Narrative persisted only when the import produced `_narrative` (REQ-028), inside the existing transactional confirm. data-smoke /patients 200, 19.
