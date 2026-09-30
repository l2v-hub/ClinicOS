# Prompt 3 Handoff — from Phase 2 (Identity, Roles, Capability Policy & Authorization)

Read with: `../CURRENT_STATE.json`, `AUTHORIZATION_ARCHITECTURE.md`, `POLICY_CONTRACT.md`,
`AGNO_READINESS.md`, `ROLE_CAPABILITY_MATRIX.json`, `TEST_REPORT.md`, and Phase 1
`../phase-1-capabilities/{CAPABILITY_CATALOG.json,TARGET_TOOL_ARCHITECTURE.md}`.
Worktree `C:/Workspace/ClinicOSHouse-worktrees/capability-layer`, branch `feat/capability-tool-layer`
(base `origin/main` 76ac4c60). **Nothing committed, pushed, migrated on Railway or deployed.**

## 1. What exists now (use it, do not rebuild it)

| Need for Skills / AI Assistant / Agno | Ready-made                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Who is the user                       | `requireOperator` + `ensureAuthorization` → `authzOf(req).identity` (identity source: Role Simulator today, Entra later) |
| What may they do                      | `authzOf(req).can(capabilityId)` / `decide(document, roleId, id)`; `/auth/me.capabilities`                               |
| Tools for the LLM orchestrator        | `GET /tools` (per identity, with `inputSchema`, `requiresConfirmation`)                                                  |
| Execute a tool                        | `POST /tools/:name/invoke {input, requestId?, confirmed?}` (+ `X-Tool-Origin: ai`)                                       |
| Confirmation UX                       | 428 `confirmation_required` → ask the user → resend with `confirmed: true`                                               |
| Agnos (TS) actions/reads              | already policy-filtered (catalog, plan, execute, each read tool)                                                         |
| Audit                                 | `AiAuditEvent`: `tool:<name>` + route capability ids, role at the time of the action                                     |
| Change permissions                    | Administrator UI "Ruoli e permessi" / `/authz/policy*` (versioned Save/Apply)                                            |

## 2. Rules Prompt 3 must respect

1. Never give the Python/Agno runtime its own permission list: build its tool list from
   `GET /tools` with the END-USER credential for every conversation turn.
2. The LLM is not a security boundary: every invocation is re-authorized server-side.
3. New skills = compositions of existing capabilities/tools. If a skill needs a new capability,
   add it to the Phase 1 catalog first, regenerate `backend/src/authz/capability-registry.json`
   (`node scripts/ai-architecture/build-authz-registry.mjs`), add baseline effects in
   `backend/src/authz/baseline.ts`, then expose a tool (Phase 1 contract).
4. Derived capabilities (Agnos actions/read tools) are governed by their functional capability
   (`governedBy`); keep channels in sync by mapping, not by duplicating grants.
5. Do not bypass `/tools` with direct service calls from AI code.

## 3. Deployment checklist (not done — requires the user's go-ahead)

- Apply migration `prisma/migrations/20260930090000_authz_policy_versions` (additive table).
- Production: `AUTH_MODE=entra`, keep `ROLE_SIMULATOR_ENABLED` unset (simulator refused in
  production anyway), set `AUTHZ_UNMAPPED_ROUTES=deny` (all current routes are catalogued — QA
  verified 0 uncatalogued routes), `AUTHZ_ENFORCEMENT` unset (= enforce).
- Entra users keep the legacy fallback (`operator` / `legacy_admin`) until the Administrator
  assigns them a new role in the Identità tab → controlled migration, zero day-one regression.
- Dev: `ROLE_SIMULATOR_ENABLED=true` (+ optional `ROLE_SIMULATOR_SECRET` ≥ 32 chars so sessions
  survive restarts).

## 4. Open gaps / risks (explicit)

| #   | Item                                                                                                                                                    | Severity         | Suggested next step                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| G1  | Data scope stays ownership-based (`registeredById`) for Doctor/Nurse/OSS (legacy `operatore` scope): Doctor 1 sees only patients registered by Doctor 1 | medium (product) | ward/team scope as a policy dimension (needs product decision + probably schema) |
| G2  | `ALLOWED_WITH_CONFIRMATION` is enforced for tools/Agno; for GUI routes it is a UI obligation (backend allows)                                           | medium           | optional `X-Confirmed` contract for critical routes                              |
| G3  | Agnos divergent writers (vitals legacy JSON, demographics, diary authorType) unchanged                                                                  | medium           | route them through the Phase 1 shared services                                   |
| G4  | 56 GAP capabilities have route-level policy but no tool                                                                                                 | low              | expose when a skill needs them (Phase 1 migration plan)                          |
| G5  | Lock-out validation requires a ROLE able to manage the policy, not an assigned identity (legacy_admin fallback keeps a path)                            | low              | require ≥1 active identity holding `authz.manage_policy`                         |
| G6  | Removing an assignment makes MANAGER identities fall back to `legacy_admin` (full rights) — now flagged in the impact preview, not blocked              | low/medium       | retire legacy roles once all identities are assigned                             |
| G7  | `X-Tool-Origin` is client metadata (audit only)                                                                                                         | low              | derive origin from the credential type                                           |
| G8  | Pre-existing: `POST /appointments` has no patient-scope check; in-memory rate limit/idempotency                                                         | medium           | Phase 1 hardening backlog                                                        |
| G9  | `query_rooms_occupancy` (assistant) governed by `assistant.query` (no dedicated catalog entry)                                                          | low              | catalog it                                                                       |
| G10 | Existing parallel DB-test flakiness; 21 pre-existing backend + 9 frontend failures on main                                                              | info             | serial CI for DB suites                                                          |

Additional low items from the independent QA re-verification: **R1** `query_data` is governed by
`therapy.list` only, though it can also read patients/appointments/rooms (no current role gains
anything; a custom role with `therapy.list` but not `appointments.list` could, only with the LLM
planner on) → per-entity check in the query engine. **R2** Doctor/Nurse/OSS denied `rooms.occupancy`
can still get occupancy COUNTS through the assistant when `canFacilityRead` is enabled (pre-Phase-2
behaviour, no patient data). Full QA reports: `artifacts/task-validation/phase-2-roles-authorization-and-capability-policy/logs/qa-phase2.md`.

## 5. Not started (per Prompt 2 scope)

Skill Architecture, AI Assistant redesign, voice pipeline changes, general redesign.
