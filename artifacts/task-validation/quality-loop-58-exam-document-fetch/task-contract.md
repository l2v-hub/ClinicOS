# Cycle 58 task contract — single scoped exam-document fetch

## Objective

Replace three identical attachment-metadata requests in “Esami & Consulenze” with one patient-scoped request and one shared in-memory grouping pass.

## Acceptance criteria

- Opening the tab issues one document metadata GET, not one per subsection.
- Exam, imaging and consultation lists retain their existing document-type filters and markup.
- Upload completion refreshes the shared metadata once and updates every subsection.
- Patient, operator or role changes abort the previous request and cannot expose stale metadata.
- Content opening and upload authentication, payloads and error behavior remain unchanged.
- Tests, build, lint and independent reviews pass without new P0/P1 findings.

## Safety envelope

- No backend endpoint, document bytes, cartella mutation or cross-tab data-flow changes.
- Do not stage unrelated local changes.
