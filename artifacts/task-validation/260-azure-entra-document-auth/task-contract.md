# Task contract — Issue #260

## PO context

ClinicOS needs production-grade identity and patient authorization before clinical document bytes can be enabled for real data. Demo headers are explicitly falsifiable and must be removed as an identity source in production.

## User impact

Without verified identity, a caller could impersonate an operator or request another patient's documents. Demo functionality remains useful for synthetic development but is not ready for real clinical use.

## Current behaviour

- `AUTH_MODE=demo` enables explicit non-production synthetic QA.
- `AUTH_MODE=entra`, missing or invalid values fail closed for sensitive document endpoints.
- Entra JWT validation and operator-to-patient authorization are not implemented.

## Expected behaviour

Validate Azure Entra ID/OIDC JWTs server-side, derive identity/role from verified claims, map the user to ClinicOS, enforce tenant and patient scope, and remove self-declared headers as an identity source.

## Acceptance criteria

1. JWT signature, issuer, audience, expiry and required claims are verified against Entra JWKS.
2. Identity and role are derived only from verified claims and server-side mapping.
3. Operator-to-patient authorization is enforced on upload, metadata and content endpoints.
4. Anonymous/invalid token returns 401; forbidden role/patient returns 403 or non-enumerating 404.
5. `AUTH_MODE=entra` enables the verified flow; missing/invalid values remain fail-closed.
6. Production never accepts `X-Operator-Id`, `X-Operator-Role` or `X-Demo-Patient-Id` as identity/authorization.
7. No token, document bytes, clinical content or raw PHI is logged.

## QA requirements

- Unit and integration tests for JWT validation and claim mapping.
- Negative API tests for forged, expired, wrong issuer/audience and cross-patient tokens.
- Playwright with synthetic identities/patients on a non-production Entra test tenant.
- Secret scan and sanitized runtime evidence.

## Evidence requirements

Store task contract, validation report, API test output, Playwright report/trace/video/screenshots and sanitized security logs under this directory.

## Definition of Done

Code review, tests, runtime validation, Playwright, privacy/security review and Codex `CLOSED — VERIFIED`; Claude must stop at `READY FOR CODEX QA`.
