# QA Gate Task Contract — PR #298 / Issue #260

- Role: INDEPENDENT QA gate session (did not write the code). Review + evidence only, never modify prod code.
- PR: #298 — branch `feat/260-entra-document-auth`, head `c853e93da704dc510c6455231268fe3c8515cdba`
- Issue: #260 — Azure Entra ID (OIDC) production-grade authentication + authorization for clinical document endpoints
- Type: security (auth/permissions, backend, frontend, DB migration, config)

## Acceptance Criteria (from issue #260)

- **AC1** — JWT signature, issuer, audience, expiry and required claims verified against Entra JWKS.
- **AC2** — Identity and role derived only from verified claims + server-side mapping (`entraObjectId`).
- **AC3** — Operator→patient authorization enforced on upload, metadata and content endpoints.
- **AC4** — Anonymous/invalid → 401; forbidden role/patient → 403 or non-enumerating 404.
- **AC5** — `AUTH_MODE=entra` enables the verified flow; missing/invalid values remain fail-closed.
- **AC6** — Production never accepts `X-Operator-Id` / `X-Operator-Role` / `X-Demo-Patient-Id` as identity.
- **AC7** — No token, document bytes, clinical content or raw PHI is logged.

## PO decisions recorded in implementer contract

- `jose` (backend JWT verify) + `@azure/msal-browser` (SPA token) approved dependencies.
- Authorization = **struttura scope**: any mapped + active operator may access every patient's documents;
  the strong constraint is verified identity + server-side mapping, not per-patient assignment.
- Config env-driven; real tenant values (ENTRA_TENANT_ID, audience, SPA client id) supplied by PO post-delivery;
  until then `AUTH_MODE=entra` is activatable only with complete config (fail-closed otherwise).

## QA bar

Synthetic-JWKS middleware flow + adversarial rejection. Real-tenant SPA login is verifiable only after
tenant configuration (prod stays fail-closed until then) — an accepted known limitation, not a failure.
