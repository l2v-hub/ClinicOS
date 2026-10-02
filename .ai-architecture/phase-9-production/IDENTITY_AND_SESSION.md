# Phase 9 — Identity and Session

## 1. Identity flow (production)

1. SPA (MSAL, `frontend/src/lib/entraAuth.ts`) signs the user in with Entra (PKCE, redirect) and
   acquires an access token for `VITE_ENTRA_API_SCOPE`. Cache: `sessionStorage` (tab-scoped).
2. Every API call carries `Authorization: Bearer <JWT>` (`lib/operatorSession.ts#operatorHeaders`).
3. Backend `requireOperator` (`backend/src/ai/auth.ts`) with `AUTH_MODE=entra` →
   `requireEntraOperator` (`lib/entra-auth.ts`): RS256 signature against the tenant JWKS, issuer,
   audience, expiry, `oid` required. Any `X-Operator-*` header is ignored.
4. Mapping server-side: `User.entraObjectId = oid` → `Operator`. One-time fallback on
   `preferred_username` auto-links an unlinked account (R-07, see §6). `isActive=false` → 403.
5. Role = ACTIVE policy assignment for the operator id (legacy role fallback), capabilities and
   resident scope evaluated **per request** (`authz/request-context.ts#ensureAuthorization`).

Authentication changes only the identity source; authorization is untouched.

## 2. Trusted server identity

| Client-sent value                              | Used?                                                                    | Evidence                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `X-Operator-Id` / `X-Operator-Role` with Entra | ignored                                                                  | E2E `identity: Entra JWT end-to-end` (forged admin header → own id, 403 on policy API) |
| `X-Operator-*` with simulator                  | refused                                                                  | Phase 2 tests                                                                          |
| role / capability / scope in body              | never read                                                               | P2 policy contract; P6 AUTH-01..06                                                     |
| `context.currentPatientId`                     | only a hint; scope re-checked, and only used on explicit «questo ospite» | P6 RES-01..07                                                                          |

## 3. Role Simulator isolation

`simulatorEnabled()` = `ROLE_SIMULATOR_ENABLED=true` ∧ `AUTH_MODE=demo` ∧ tier ≠ production ∧
(NODE_ENV≠production ∨ `ROLE_SIMULATOR_ALLOW_PRODUCTION=true`). On tier `production`:
`operatorAuthMode()` returns `disabled` for `demo`, `productionDemoAuthEnabled()` is false, and the
startup validation refuses the flags (exit 1). Endpoints `/auth/simulator/*` answer 404; query
strings, hidden URLs and localStorage cannot re-enable it (the SPA only shows the simulator when
`GET /auth/status` says so, and the server enforces it on every request).
Tested: `simulator: production config → endpoints unreachable…` (HTTP) and unit tier tests.

**Explicit tier required in production.** Without `CLINICOS_ENV`, the tier is derived and
`DEMO_DATASET_ID=synthetic-v1` alone turns a service into «demo» (the same flag set that gated demo
auth before Phase 9). Startup now warns `CLINICOS_ENV non impostato`; go-live sets
`CLINICOS_ENV=production`, after which no variable can re-enable demo identities and the demo
markers become startup errors (independent review finding M1).

## 4. Session lifecycle

| Aspect                                  | Entra (production)                                                                                                                                                                                                                           | Simulator (dev/demo)                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Expiry                                  | JWT `exp` (tenant policy, typically 60–90 min) verified per request                                                                                                                                                                          | 12 h HMAC token                                                                    |
| Renewal                                 | silent `acquireTokenSilent` every 4 min (`App.tsx` `tokenRenewalRef`); interaction needed → next call 401 → login                                                                                                                            | none (re-login)                                                                    |
| Logout                                  | SPA clears MSAL cache (`clearEntraSession`) + all client state; the IdP SSO session is NOT ended (no `logoutRedirect`) and the JWT stays valid until `exp` (stateless, no server revocation). Shared ward tablets: consider `logoutRedirect` | `POST /auth/simulator/logout` revokes the session id server-side (204, idempotent) |
| User disabled                           | next request 403 (`identity_inactive`)                                                                                                                                                                                                       | n/a                                                                                |
| Role/policy change                      | next protected call (policy version read per request)                                                                                                                                                                                        | same                                                                               |
| Concurrent sessions                     | allowed (two tabs = same identity, independent workflows)                                                                                                                                                                                    | same                                                                               |
| Resident context / pending confirmation | invalidated on identity/role/resident change (P4/P8 §5, tests F/G/H/L)                                                                                                                                                                       | same                                                                               |

Residual: an exfiltrated Entra access token remains usable until `exp`. Mitigations: short token
lifetime (tenant Conditional Access / token lifetime policy), CAE not implemented. Recorded in
PROMPT10_HANDOFF residual risks.

## 5. CSRF / cookies / CORS / replay

- No cookies carry identity (Bearer header only) → classic CSRF not applicable; CORS allowlist is
  exact-match (`app.ts#isAllowedOrigin`), unknown origin → 403 (tested).
- `credentials: true` in CORS is harmless (no auth cookies) and kept for compatibility.
- Replay of sensitive writes: confirmation bound to `workflowId + previewId` and identity; executed
  once (store compare-and-set `skills/store.ts`, idempotent tools); duplicate/concurrent/late
  confirmations → exactly one row (tests `AI off…`, `concurrency…`, drill R1/R2).

## 6. Decisions still owned by the organisation

- **R-07** `preferred_username` auto-link: acceptable for a single-tenant issuer pinned to the
  tenant; set `entraObjectId` explicitly for privileged accounts or disable auto-link before rollout.
- Token lifetime / Conditional Access policy in the tenant.
- Who maps new staff (`User.entraObjectId`) — today: admin/DB-ops, no UI.

## 7. External blocker

No Entra app registration is configured anywhere: Railway production has no `AUTH_MODE` /
`ENTRA_*`; Vercel production has only `VITE_API_URL` (verified 2026-10-01 by variable _names_).
Required to go live: `AUTH_MODE=entra`, `ENTRA_TENANT_ID`, `ENTRA_AUDIENCE` (backend);
`VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_API_SCOPE` (frontend build); users'
`entraObjectId` mapping; policy assignments for real operator ids.
