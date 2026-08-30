# Cycle 70 task contract — bound the legacy intake document list

## Objective

Prevent the deprecated patient-intake collection endpoint from becoming an unbounded OCR/clinical-JSON export and memory amplification path.

## Acceptance criteria

- The list query requests at most 51 rows: 50 response rows plus one truncation sentinel.
- The collection projection excludes base64 file data, raw OCR and extracted clinical JSON.
- Results remain newest-first with a deterministic ID tie-break and preserve the existing JSON-array response shape.
- `X-Result-Truncated` truthfully reports whether the sentinel row was present.
- Anonymous callers receive `401`; ordinary operators receive `403`; denials remain `private, no-store`.
- The existing admin/manager compatibility gate, deprecation headers and write endpoints remain unchanged.
- Focused tests, backend build/lint, diff checks and independent security/performance reviews pass.

## Safety envelope

- No schema, frontend or current intake-draft flow change.
- No raw-document detail endpoint is introduced.
- Do not stage unrelated local changes.
