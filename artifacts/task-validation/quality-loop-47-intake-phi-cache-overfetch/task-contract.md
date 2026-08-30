# Cycle 47 task contract — intake PHI cache and overfetch

## Objective

Keep deprecated discharge-letter responses out of caches and avoid loading multi-megabyte document content when extraction only verifies record existence.

## Acceptance criteria

- Every `/patient-intake` response carries `Cache-Control: private, no-store`.
- The cache policy runs before authentication and RBAC and therefore covers success, denial and error paths.
- Extraction existence checks select only the document ID.
- Stored base64, OCR text and extracted JSON are not materialized by that check.
- Existing payloads, role gates, deprecation headers and sunset date remain unchanged.
- Focused tests, targeted lint, backend build and independent reviews pass without P0/P1.

## Safety envelope

- No schema, OCR parser, clinical payload or authorization behavior changes.
- Keep the deprecated route functional for admin/manager compatibility until sunset.
- Do not stage unrelated local changes.
