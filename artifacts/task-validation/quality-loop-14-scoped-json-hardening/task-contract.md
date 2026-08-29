# Task Contract

## Task

- Title: Quality loop 14 scoped JSON hardening
- Slug: `quality-loop-14-scoped-json-hardening`
- Type: Security/availability/API hardening
- Date: 2026-08-29

## Baseline

Every API route parses up to 10 MB of JSON before authentication and rate limiting. Most endpoints
accept only small commands, filters or structured records; only the deprecated privileged intake
compatibility flow needs a multi-megabyte base64 body. Security headers are applied after CORS and
body parsing, and API responses do not carry a CSP.

## Expected Behaviour

Current JSON APIs reject bodies above 512 KiB. The legacy intake router retains an 8 MiB envelope,
but only after operator authentication and admin/manager RBAC. Oversized and malformed JSON receive
uniform JSON errors with the same non-renderable security headers as successful API responses.

## Acceptance Criteria

- AC1: the standard JSON limit is 512 KiB instead of 10 MB.
- AC2: `/patient-intake` bypasses the standard parser and applies its 8 MiB parser only after
  `requireOperator` and `requireRole('admin', 'manager')`.
- AC3: anonymous legacy requests are rejected before parsing the compatibility body.
- AC4: oversized standard and legacy payloads return JSON `413 payload_too_large`.
- AC5: health, auth failures and 413 responses carry CSP, nosniff, anti-frame and referrer policy.
- AC6: no route schema, authentication mode, database write or frontend contract changes.
- AC7: focused hardening tests, full backend regression, build, lint, diff check and independent
  security plus regression reviews pass.

## Gate Status

PASS FOR BRANCH WITH DB REGRESSION GATE OPEN — production deploy remains blocked
