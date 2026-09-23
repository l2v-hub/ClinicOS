# PO10 frontend execution receipt and plan

Root GO authorizes the claimed frontend implementation in the isolated cfe0e16b worktree. One writer; the root hierarchy coordinates backend, independent read-only review, browser QA and publication. Local policy decision: allow source edits, dependency reads and focused checks; deny unassigned schema/dependency/publication changes. Both launcher hashes remain protected.

Recall: Ruflo guidance returned the standard recall/inspect/route/plan/execute/test/validate/receipt flow. Memory search found adjacent OCR/therapy/document provenance patterns, not a PAINAD implementation. Authoritative clinical text, editorial provenance and DTOs were read in root and backend worktrees. Registration was not interpreted as tool health or authority.

Implement a static versioned PAINAD definition, strict assessment client, session-owned per-patient draft store, bounded history and one editor/preview/final/PDF route. Five nullable answers remain distinct from zero; full answer descriptions and provenance are preserved. Finalization requires a saved complete preview and a stable request ID. Ambiguous writes retain their payload; PATCH reconciles by GET and CAS. Conflicts never silently replace answers. Patient/session generations fence callbacks and reads. App memory retains drafts across internal navigation and warns at reload/logout loss boundaries.

Reuse PatientIdentity, ClinicalTableSection, PatientArchivePreview and existing multi-print. Add Moduli → PAINAD without removing NRS or moving Dimissione. Generated assessment documents use authoritative metadata, their clinical date, a dedicated archive category and reciprocal assessment navigation; manual classification/edit paths exclude the reserved generated type.

Validation: exhaustive 243 complete/781 incomplete PAINAD scoring cases; request/DTO scope and replay checks; deferred store/session/CAS/finalization tests; focused UI/archival/navigation regressions, types/build and baseline-relative scoped lint. Root owns browser geometry, keyboard behavior, PG/HTTP integration and PDF visual verification. Handoff binds source/evidence hashes and releases claims.
