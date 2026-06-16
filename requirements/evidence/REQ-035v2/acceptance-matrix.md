# REQ-035 v2 — Acceptance matrix

Issue: #46 — *Collegare permanentemente al paziente i documenti d'importazione* (Critical; commit "REQ-030" stale).
Type: **Backend (model/storage/API) + Frontend (Documenti tab + source side panel)**.

Storage choice: file bytes are kept IN Postgres (base64), like the existing `PatientIntakeDocument` — survives Railway redeploy/restart with no external object storage; `onDelete: Cascade` means deleting the patient removes the documents and their bytes (no orphan storage to clean).

| # | Acceptance criterion | Evidence | Status |
|---|----------------------|----------|--------|
| 1 | Source files saved as patient documents | confirm-service `persistImportDocuments` (in create tx) | PASS |
| 2 | Documents appear in Documenti section | `patient-imported-documents-tab.png` | PASS |
| 3 | Available after refresh/redeploy | bytes in Postgres (not temp FS) | PASS |
| 4 | Each imported section shows "Confronta con il documento" | `patient-section-source-action.png` | PASS |
| 5 | Side panel opens the correct file | `patient-anamnesis-source.png` (PDF) | PASS |
| 6 | Side panel opens the correct page | DocumentPreview `sourceTarget.page` (pageFrom) | PASS |
| 7 | Side panel shows the original text | "Testo rilevato" block | PASS |
| 8 | Section text editable | NarrativeClinicalSection edit (REQ-030) | PASS |
| 9 | Edit doesn't alter the original file | edits → reviewedText; file untouched | PASS |
| 10 | Edit doesn't drop the source link | sourceReferences kept | PASS |
| 11 | No versioning of edits | only originalText/reviewedText | PASS |
| 12 | Allergies keep the source | ALLERGIES section + side panel | PASS |
| 13 | Documents not public | served by authenticated backend content endpoint; ownership check `patientId===param` | PASS |
| 14 | Patient delete removes document records | FK `onDelete: Cascade` | PASS |
| 15 | Patient delete removes the files | bytes are in the DB → cascade deletes them | PASS |
| 16 | No orphan files | no external storage (bytes in DB) | PASS |
| 17 | DB relations use cascade | `PatientDocument.patientId onDelete: Cascade` | PASS |
| 18 | Deletion idempotent | DELETE returns 404 if already gone (existing route) | PASS |
| 19 | Works desktop + tablet | side panel responsive (`max-width:767px` fullscreen) | PASS |

## API (mounted at /patients)
- `GET /patients/:id/documents` — metadata (no bytes).
- `GET /patients/:id/documents/:docId/content` — file bytes, mime-typed, `Cache-Control: private, no-store`, ownership-checked. No public URLs.

## Model
`PatientDocument` (id, patientId FK CASCADE, importJobId, originalName, mimeType, sizeBytes, sha256, dataBase64 TEXT, documentType, sortOrder, createdAt). Migration `20260616220000_add_patient_documents`.

## Tests / build
- backend 96/96, `tsc` 0 · frontend 14/14, `tsc -b` + `vite build` ✓.
- E2E: imported docs visible in Documenti tab; side panel opens from a section + shows source text. /patients 200, 20.

## Notes
- Headless Chromium blanks the native PDF body (renders in a real browser); SVG preview renders fully.
- "Migration of already-imported patients" (§13): future imports auto-link; existing patients have no PatientDocument rows (job files are ephemeral on Railway) — the UI shows nothing rather than a fake link, per the rule "Non creare un collegamento fittizio".
