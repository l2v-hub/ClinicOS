# Authorization Architecture — Phase 2

One system, one decision function:

```
Identity source (Role Simulator | Entra | legacy demo headers)
        │  requireOperator (ai/auth.ts) — WHO, never WHAT
        ▼
Role  ← active policy document: assignments[operatorId] ?? legacy fallback(verified legacy role)
        │  authz/request-context.ts#ensureAuthorization (once per request, fresh policy)
        ▼
Capability/Policy Registry — authz/decision.ts#decide(document, roleId, capabilityId)
        │
        ├── API routes: authz/route-gate.ts (app.ts, before every router) → 403 capability_denied
        ├── Tool Layer: authz/tool-policy.ts = default hook of tools/hooks.ts (discovery + invoke)
        ├── Agnos: /ai/actions/catalog filter, plan/execute gate (agnos.action.* → functional cap),
        │          assistant read tools (ai.read.* → functional cap) via UserContext.readToolAllowed
        ├── /authz/* admin API: authz/require-capability.ts
        └── GUI: /auth/me → capabilities → nav/actions hidden/disabled (backend still enforces)
```

## 1. Model (data, not code)

- `AuthzPolicyVersion` (prisma, migration `20260930090000_authz_policy_versions`, additive): one
  immutable row per version: `document` (roles, grants, assignments, review notes, defaultEffect),
  `status` draft|active|superseded, `basedOnVersion`, `changeSummary` (before/after), author id/name/
  role, `createdAt`, `appliedAt/appliedById`. No row is ever rewritten in content.
- No version in DB ⇒ the code baseline (`authz/baseline.ts`) is the implicit version 0.
- Roles are entries of `document.roles` (`id`, `label`, `description`, `legacy?`, `legacyRole`,
  `uiShell`). Adding a role is a policy edit, not a code change (tested with a custom
  `physiotherapist` role). The 5 initial roles + 2 legacy roles are baseline content only.
- Effects: `ALLOWED`, `READ_ONLY` (allowed on read capabilities, `read_only` denial on writes),
  `ALLOWED_WITH_CONFIRMATION` (tools/Agno require `confirmed: true`, else 428; GUI routes treat it
  as allowed and the UI confirms), `DENIED`. `defaultEffect` = DENIED (deny-by-default).
- Capabilities: `backend/src/authz/capability-registry.json`, generated from the Phase 1 catalog
  (`scripts/ai-architecture/build-authz-registry.mjs`; drift test in `policy-model.test.ts`).
  144 policy-governed, 32 derived (Agnos actions/read tools, page-session import aliases → governed
  by their functional capability), public/service/identity capabilities outside role policy
  (drug catalog search, health, `/auth/status`, `/internal/ai` service-token gateway, `/auth/me`).

## 2. Identity and the legacy `Operator` migration

- `requireOperator` stays the single identity gate and remains synchronous for its callers. New
  branch: when `ROLE_SIMULATOR_ENABLED=true` (AUTH_MODE=demo, not production unless
  `ROLE_SIMULATOR_ALLOW_PRODUCTION=true`) only a server-signed `Bearer sim.*` session is accepted;
  `X-Operator-*` headers are refused (`simulator_session_required`) → the client cannot self-assign
  identity or role.
- Simulator tokens (HMAC-SHA256, `ROLE_SIMULATOR_SECRET` or per-process secret, 12 h) carry only
  the identity id. The role is re-resolved from the ACTIVE policy on every protected request.
- Role resolution (`decision.ts#resolveRoleId`): explicit assignment in the policy; otherwise legacy
  fallback from the server-verified legacy role string: `admin|manager` → `legacy_admin`,
  `operatore|operator` → `operator`. Legacy roles are kept, marked `legacy`, with policy equal to
  today's behaviour (tested cell by cell) → existing identities/tests keep working; migration =
  assign a new role to an identity in the policy (Identità tab). Legacy roles cannot be removed while
  they are the fallback (validation).
- Compat role for pre-existing services (`req.operator.role`): assigned roles speak through
  `RoleDefinition.legacyRole` (administrator→admin, supervisor→manager, doctor/nurse/oss→operatore),
  preserving the existing data scope rules (global vs `registeredById`) without rewriting services.
  A spoofed header role for an assigned identity is overwritten by the compat role (no escalation).
- Real login later: replace only the identity source (Entra already flows through the same
  `ensureAuthorization`; assign roles to Entra operator ids in the policy).

### Where `Operator`/Administrator was used (inventory, unchanged business logic)

`patients/patient-scope.ts` (GLOBAL_PATIENT_ROLES), `routes/note.ts:17`, `routes/consegne.ts:14`,
`consegne/read-service.ts:11`, `ai/ownership-policy.ts:4`, `routes/farmaci.ts:33`,
`routes/ai-audit.ts:15`, `ai/gateway/context.ts:174`, `ai/assistant/service.ts:181`,
`services/appointment-service.ts:70`, `requireRole('admin','manager')` in `admin-rooms`,
`operators`, `patient-intake`, `roster-order`, `patients` (seed/demo), `ai-jobs` (sweep);
frontend `Login.tsx`, `mockData.ts`, `App.tsx` (`isAdmin`), `TeamsLikeSidebar.tsx`. These now sit
BEHIND the capability gate (the gate decides first); they keep enforcing data scope inside
services. Centralising them is a follow-up, not required for enforcement.

## 3. Enforcement points (DENY BY BACKEND)

| Channel          | Point                                                                                                                          | Denial                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| GUI/API routes   | `authz/route-gate.ts` mounted in `app.ts` before all routers; matches method+path to the catalogued capability (most specific) | 403 `{code: capability_denied\|read_only, capability, role}` |
| Tool Layer       | default authorization hook = `authz/tool-policy.ts` (re-resolves the role from operator id)                                    | 403 envelope; 428 `confirmation_required`                    |
| Tool discovery   | `GET /tools` lists only allowed tools (+ `requiresConfirmation`)                                                               | tool absent                                                  |
| Agnos actions    | `orchestrate.ts` plan + execute (`capability_denied`, 403), `/ai/actions/catalog` marks disabled                               | refusal                                                      |
| Agnos read tools | `ai/assistant/service.ts` loop checks `UserContext.readToolAllowed`                                                            | refusal "non consentito al tuo ruolo"                        |
| Policy admin     | `/authz/*` via `requireCapability`                                                                                             | 403                                                          |
| Voice            | same orchestrator + `voice.*` route capabilities                                                                               | 403                                                          |

Uncatalogued routes: allowed by default in dev (`AUTHZ_UNMAPPED_ROUTES=allow`); set `deny` for
production-ready configurations. `AUTHZ_ENFORCEMENT=off` is an emergency switch that restores the
Phase 1 legacy gates (not for production).

## 4. Revocation and consistency

`policy-cache.ts` checks the active version with one indexed query per protected request and
re-reads the document only when it changed → Save/Apply reaches already-open sessions at their next
protected call, on every instance, without re-login (tested with the same Nurse 1 token).

## 5. Audit and history

- Route gate: every denial and every non-read allowed call → `AiAuditEvent` (operatorId, operatorRole
  = policy role at that moment, actionType = capability id, kind, channel gui|ai, patientId, fields
  `route:METHOD`, `effect:…`, `policy:vN`, outcome ok|error|denied). PHI-safe.
- Tool Layer: `tool:<name>` events with the deciding role, origin, outcome (Phase 1 sink).
- Policy changes: `AuthzPolicyVersion` rows (author, role, timestamps, before/after) + an
  `AiAuditEvent` `authz.policy_save_*`/`authz.policy_apply`.
- History is never rewritten: domain rows keep their author ids/names; audit rows keep the role at
  the time of the action (tested after a revocation).

## 6. Security properties

Least privilege baseline for new roles; deny-by-default; server-side enforcement on every channel;
input validation of policy documents (unknown roles/capabilities/effects, lock-out protection,
legacy fallback protection); privilege escalation prevented (identity only from signed session /
Entra; role only from policy; spoofed headers ignored; tool inputs cannot carry identity);
technical Administrator separated from operational Supervisor (Administrator: policy/users/structure,
no clinical writes; Supervisor: operations and clinical reads, read-only policy view); Role
Simulator disabled by default and refused in production.
