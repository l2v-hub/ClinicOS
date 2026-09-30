# Phase 2 — Current State

- Phase: 2 — Identity, Roles, Capability Policy & Authorization
- Status: see `../CURRENT_STATE.json`
- Date: 2026-09-30 · worktree `C:/Workspace/ClinicOSHouse-worktrees/capability-layer` · branch `feat/capability-tool-layer` — not committed / pushed / deployed; migration not applied anywhere but the local disposable DB.
- Quality gate: `artifacts/task-validation/phase-2-roles-authorization-and-capability-policy/`

## Delivered

| Slice                                                        | Where                                                                                                                                                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity/role/policy model (versioned doc, 1 additive table) | `prisma/schema.prisma` `AuthzPolicyVersion`, migration `20260930090000_authz_policy_versions`, `backend/src/authz/{types,registry,capability-registry.json,policy-document,decision}.ts` |
| Controlled migration of legacy Operator/Admin                | legacy roles `operator`, `legacy_admin` = today's behaviour; compat role strings for services (`request-context.ts`)                                                                     |
| Authorization service                                        | `decision.ts`, `policy-store.ts`, `policy-cache.ts`, `impact.ts`, `require-capability.ts`                                                                                                |
| Backend enforcement                                          | `route-gate.ts` in `app.ts` before all routers; `/authz` guarded                                                                                                                         |
| Role Simulator                                               | `simulator.ts`, `requireOperator` branch, `/auth/simulator/*`, frontend `Login.tsx`, `lib/operatorSession.ts`                                                                            |
| Administrator Role & Capability UI                           | `frontend/src/components/admin/RolePermissionsPage.tsx` + `role-permissions/*`, `lib/authzPolicyApi.ts`, nav "Ruoli"                                                                     |
| Baseline                                                     | `baseline.ts`, exported `ROLE_CAPABILITY_MATRIX.json` (7 roles × 144 capabilities, 60+ doubtful cells flagged)                                                                           |
| Tool Layer / Agno                                            | default hook `tool-policy.ts`, confirmation support, `/tools` discovery per identity; Agnos catalog/plan/execute/read tools filtered                                                     |
| Audit / versioning                                           | route + tool audit with role at the time; `AuthzPolicyVersion` history with before/after                                                                                                 |
| GUI capability-awareness                                     | `lib/capabilities.ts` (`useCan`), sidebar filtering, key action gating, focus refresh                                                                                                    |
| Tests                                                        | `backend/src/authz/__tests__/*` (19), browser script `qa-evidence/phase2-roles/roles-evidence.mjs` (10 steps)                                                                            |

## Documents

`AUTHORIZATION_ARCHITECTURE.md` · `POLICY_CONTRACT.md` · `AGNO_READINESS.md` · `ROLE_CAPABILITY_MATRIX.json` · `TEST_REPORT.md` · `PROMPT3_HANDOFF.md`
