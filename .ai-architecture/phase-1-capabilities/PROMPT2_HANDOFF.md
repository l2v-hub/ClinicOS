# Prompt 2 Handoff — from Phase 1 (Capability Catalog & Tool Layer)

Read with: `../CURRENT_STATE.json`, `CAPABILITY_CATALOG.json` (catalog of record),
`TARGET_TOOL_ARCHITECTURE.md` (contract), `MIGRATION_PLAN.md` §2.1 (what Phase 2 must do).
Branch/worktree: `feat/capability-tool-layer` @ `C:/Workspace/ClinicOSHouse-worktrees/capability-layer`
(base `origin/main` 76ac4c60). Nothing committed/pushed/deployed.

## 1. What Phase 2 can rely on

| Asset              | Where                                                                                             | Contract                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capability ids     | `CAPABILITY_CATALOG.json` → `capabilities[].capability_id`                                        | stable, `<domain>.<verb_object>`; 200 entries, 56 exposed as tools (`exposure: "TOOL"`)                                                                                                                         |
| Tool registry      | `backend/src/tools/index.ts#defaultToolRegistry`, `allToolDefinitions`                            | `invoke(name, input, {identity, origin, requestId})` → `ToolResult`                                                                                                                                             |
| Authorization hook | `backend/src/tools/hooks.ts#setAuthorizationHook(hook)`                                           | `(tool, ctx, input?) → {allowed, code?, reason?}`; called on every invoke AND by `GET /tools` (discovery with `input` undefined). Errors fail closed. Default = `legacyRoleAuthorization` (tool.`legacyRoles`). |
| Audit hook         | `hooks.ts#setAuditHook`                                                                           | `ToolAuditEvent {tool, auditKind, requestId, operatorId, operatorRole, origin, patientId, fields(names), outcome, errorCode?}`; default sink = `AiAuditEvent` (actionType `tool:<name>`, channel = origin)      |
| Identity in tools  | `ToolContext.identity {operatorId, role, name}` from `requireOperator` (`backend/src/ai/auth.ts`) | input schema rejects identity/role keys; `actorOf(ctx)` feeds services                                                                                                                                          |
| HTTP for Agno      | `GET /tools`, `POST /tools/:name/invoke` (`backend/src/tools/http.ts`, mounted in `app.ts`)       | identity from auth gate only; `X-Tool-Origin` = audit metadata                                                                                                                                                  |
| Tests              | `backend/src/tools/__tests__/*.test.ts` (13 files)                                                | real Postgres; GUI-parity cases for 45 capabilities; `tool-catalog-consistency.test.ts` binds registry ⇄ catalog                                                                                                |

## 2. Current identity/role model (what must migrate)

- Runtime role strings: Entra → `operator` / `manager` (from `User.role` enum `OPERATOR|MANAGER`);
  demo → `operatore` / `admin` (self-declared via `X-Operator-Role` in dev/test; server-pinned for
  the two seed ids `SEED-OP-001` Laura Bianchi / `SEED-OP-004` Admin Demo in production-demo).
- "Privileged" = `{admin, manager}` everywhere, duplicated in: `patients/patient-scope.ts:12`
  (`GLOBAL_PATIENT_ROLES`, `hasGlobalPatientScope`, `patientScopeWhere`), `routes/note.ts:17`,
  `routes/consegne.ts:14`, `consegne/read-service.ts:11`, `ai/ownership-policy.ts:4`,
  `routes/farmaci.ts:33`, `routes/ai-audit.ts:15`, `ai/gateway/context.ts:174`,
  `ai/assistant/service.ts:181`, `services/appointment-service.ts:70` (`canManageAnyAppointment`),
  and `requireRole('admin','manager')` in `routes/admin-rooms.ts:35`, `operators.ts:25`,
  `patient-intake.ts:25`, `roster-order.ts:22`, `patients.ts:277/313`, `ai-jobs.ts:245`.
- `ALLOWED_ROLES` sets: `ai/auth.ts:17`, `ai/gateway/context.ts:15`.
- The public assistant clamps gateway roles to `operatore` (`routes/ai-assistant-public.ts:26`).
- Professional role (`Operator.ruolo`: medico / infermiere / oss / fisioterapista / coordinatore /
  operatore / altro) exists in DB and drives diary `authorType` (`patients/diary-author.ts`) —
  natural seed for Doctor / Nurse / OSS mapping. No DB model for roles, policies or policy versions.
- Frontend: `Login.tsx` role picker (Amministratore / Operatore) → hardcoded users
  `mockData.ts:92/100` (`admin1`, `op1`); `App.tsx:1834 handleLogin` → `/auth/me`; UI role
  `admin|operatore` (`types.ts:6`), `isAdmin` gating in `App.tsx:2898` and ~15 components;
  `lib/operatorSession.ts` sends `X-Operator-Id`/`X-Operator-Role` on every call. State not persisted.

## 3. Capability facts Phase 2 needs for the baseline

- 56 tools; `legacyRoles: ['admin','manager']` on: `roster.list_contexts`,
  `roster.set_context_default`, `rooms.occupancy` (others open to any operator + service scope).
- Sensitivity of tools: critical 8 · high 27 · medium 14 · low 7 (field `sensitivity`).
- Clinical-write tools (candidates for Doctor-only / confirmation): `therapy.create`,
  `diary.create_with_therapy`, `administration.confirm`, `administration.record_not_administered`,
  `clinical_record.save`, `parameters.*` writes, `assessments.finalize|attest`,
  `intake.confirm_draft`, `documents.upload|update_type`, `narrative.save`.
- Hard deletes are GUI_ONLY (never tools): `appointments.delete`, `consegne.delete`,
  `patients.delete`, `therapy.delete`, `diary.delete`, `room_assignments.delete`, … — Phase 2
  policies still need to govern them at route level.
- 56 GAP capabilities (notes, operators, rooms/beds, room assignments, patient create/update,
  therapy update/list, consegne update …) have NO tool: route-level enforcement is the only place
  a policy can apply to them.
- AI: 15 Agnos read tools + 8 Agnos actions are `AGNOS_INTERNAL` (own orchestrator
  `ai/actions/orchestrate.ts`, catalog `ai/actions/catalog.ts`). Divergent Agnos writers (vitals,
  demographics, diary note) documented; not changed.

## 4. Recommended insertion points (minimum, per "WRAP, DON'T REWRITE")

1. **Policy service** (new module, e.g. `backend/src/authz/`): `can(identity, capabilityId)` →
   `ALLOWED | READ_ONLY | ALLOWED_WITH_CONFIRMATION | DENIED`, reading the versioned matrix.
2. **Tool Layer**: `setAuthorizationHook(policyHook)` at app start — no tool changes.
3. **Routes**: `requireCapability(id)` middleware beside `requireOperator` on catalogued routes
   (same decision function) → denial even when GUI/Agno are bypassed.
4. **Identity**: replace self-declared demo role with server-owned simulated identities
   (resolve role from DB by identity id); keep `requireOperator` as the single identity source so
   Entra later replaces only the source.
5. **Agnos**: filter `GET /tools` and the Agnos action catalog by the same policy.
6. **Audit**: default audit sink already records identity/role/origin per tool call; add route
   audit via the same `recordAuditEvent` for capability-guarded writes.

## 5. Known limits / open items

- Tests run on a disposable local Postgres (embedded, port 54329, scratchpad) — never on
  Railway prod. Pre-existing baseline failures (37 on main) are listed in REGRESSION_BASELINE.md.
- 12 `AGNOS_INTERNAL` capabilities are EXPOSED without direct test evidence (explicitly marked).
- 63 READY/WRAP capabilities are NOT_EXPOSED (external runtime/OCR, service-token internal API,
  identity/infra, external AIFA) — rationale per entry in the catalog.
- Tool calls via `/tools` share the 60/min per-operator limiter; `drugs.*` tools do not inherit the
  public per-IP limiter of `/farmaci/*`.
- Documents tools apply ownership scope (stricter than the Entra route, which is facility-wide).

## 6. Independent QA findings carried into Phase 2

Phase 1 was certified by an independent QA agent (verdict READY FOR QA). The two MEDIUM
findings were fixed before closure (HTTP body limit for `documents.upload`; duplicated route
logic moved into shared functions). Open LOW items Phase 2 must respect:

- `X-Tool-Origin` is client-declared: never use it for authorization; derive channel server-side.
- The default audit sink does not persist `errorCode` (denial reason) — the Phase 2 audit slice
  should store the policy decision/reason.
- `patientId` in tool audit events comes from the (validated-shape) input, before the scope check.
- A few tools import route modules for shared helpers (`routes/therapy.ts`,
  `routes/patient-documents.ts`, `routes/ai-assistant-public.ts`); acceptable, but new policy code
  should live in its own module, not in routes.
- `backend/artifacts/` (PDFs written by existing assessment tests) and the CRLF-only changes of
  `run-claude-queue.ps1` / `start-claude-team.ps1` are NOT part of this work — exclude from commits.
