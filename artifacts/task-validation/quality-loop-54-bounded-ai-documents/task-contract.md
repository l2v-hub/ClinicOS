# Cycle 54 task contract — bounded AI document metadata

## Objective

Prevent the assistant document endpoint from materializing an unbounded patient document list or exposing internal metadata unnecessary to the model.

## Acceptance criteria

- The AI-only database query uses a deterministic 101-row lookahead.
- The gateway returns at most 100 metadata rows and 100 matching source references.
- More than 100 rows sets `truncated=true` for partial-result disclosure.
- The AI projection includes only `id`, `originalName`, `mimeType`, `sizeBytes`, `documentType` and `createdAt`.
- Bytes, hashes, import IDs and sort internals never enter the AI projection.
- Tenant/patient ACL and the complete UI document-list contract remain unchanged.
- Tests, build, lint and independent reviews pass without P0/P1.

## Safety envelope

- No schema, upload, content-download, public list or authorization changes.
- Do not stage unrelated local changes.
