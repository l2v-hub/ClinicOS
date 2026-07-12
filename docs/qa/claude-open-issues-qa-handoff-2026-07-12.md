# Claude alignment — open-issues QA gate (2026-07-12)

## Outcome

- #225 and #241–#245: integrated on `main`, independently validated through #256, final individual reports promoted to `CLOSED — VERIFIED`.
- #239: scoped PR #258 merged to `main`; 68/68 targeted routing/safety tests and both builds passed; live-UI evidence accepted; final decision `CLOSED — VERIFIED`.
- #246: remains `QA FAILED` and excluded from integration. Do not merge PR #253.

## Issue #246 — updated demo delivery contract

The document flow is now explicitly split by `AUTH_MODE`. `demo` is allowed only outside production for synthetic QA; `entra`, missing and invalid configurations fail closed. Caller-provided demo headers remain falsifiable and are not secure authentication.

Required before returning to QA:

1. Preserve upload/list/open/download and persistence in explicit demo mode.
2. Preserve magic-byte/MIME/size/ownership/no-store protections and sanitized logs.
3. Do not enable demo in production or when configuration is absent/invalid.
4. Keep #246 open while its explicit server-verifiable identity requirement remains unmet.
5. Implement Entra/JWT/real operator-patient authorization separately in #260.

No fake password, token or production-looking credential was introduced. The demo patient-scope header prevents accidental cross-patient requests during synthetic QA but is not a production authorization control.
