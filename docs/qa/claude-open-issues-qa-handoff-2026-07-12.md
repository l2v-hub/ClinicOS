# Claude alignment — open-issues QA gate (2026-07-12)

## Outcome

- #225 and #241–#245: integrated on `main`, independently validated through #256, final individual reports promoted to `CLOSED — VERIFIED`.
- #239: scoped PR #258 merged to `main`; 68/68 targeted routing/safety tests and both builds passed; live-UI evidence accepted; final decision `CLOSED — VERIFIED`.
- #246: remains `QA FAILED` and excluded from integration. Do not merge PR #253.

## Issue #246 — blocking contract

The current document routes trust caller-provided `X-Operator-Id` and `X-Operator-Role`. This is not server-verifiable authentication and does not establish caller-to-patient authorization. Magic-byte validation is accepted, but it does not resolve this block.

Required before returning to QA:

1. Implement a server-verifiable identity/session (recommended: Azure Entra ID/OIDC; no shared browser secret and no role header trust).
2. Derive identity and role server-side from verified claims.
3. Enforce caller-to-patient scope for upload, metadata and content access.
4. Add negative tests: no credential 401; forged headers 401; forbidden role 403; out-of-scope patient 403/404; other-patient document 404; MIME mismatch 415; unsupported signature 415; oversize 413 JSON.
5. Prove authenticated upload, reload persistence and authenticated blob retrieval with Playwright.
6. Commit sanitized logs and complete artifacts under `artifacts/task-validation/246-*`.
7. Stop at `READY FOR CODEX QA`; Claude must not apply Codex-only labels or close the issue.

No code change was applied for #246 in this gate because the missing identity provider is an explicit architectural prerequisite; inventing demo credentials would weaken the privacy requirement and would not be accepted.
