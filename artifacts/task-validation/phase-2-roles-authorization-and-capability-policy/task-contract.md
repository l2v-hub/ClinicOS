# Task Contract

## Task

- Title: Phase 2 roles authorization and capability policy
- Slug: phase-2-roles-authorization-and-capability-policy
- Type: feature
- Date: 2026-09-30
- Source: `.ai-prompts/PROMPT_2_ROLES_AUTHORIZATION.md` (user request, 2026-09-30), after Phase 1 CLOSED — VERIFIED
- Branch/worktree: `feat/capability-tool-layer` @ `C:/Workspace/ClinicOSHouse-worktrees/capability-layer`
- Input of record: `.ai-architecture/CURRENT_STATE.json`, `.ai-architecture/phase-1-capabilities/PROMPT2_HANDOFF.md`

## Impact Classification

| Area                 |                                                                                                          Impacted |
| -------------------- | ----------------------------------------------------------------------------------------------------------------: |
| Frontend/UI          |                yes (Role Simulator on login, Administrator "Ruoli e permessi" page, capability-aware nav/actions) |
| Backend/API          |                   yes (identity resolution, policy service, route gate, `/authz/*`, simulator session, tool hook) |
| Database/Persistence | yes — ONE additive table `AuthzPolicyVersion` (versioned roles + matrix + assignments); no existing table changed |
| Agnos AI / Chatbot   |                                          yes (tool discovery and Agnos action catalog/execute filtered by policy) |
| Voice                |                                                      yes (voice execute goes through the same Agnos execute gate) |
| OCR / Import         |                                                  no (routes governed by the gate like any other catalogued route) |
| Auth / Permissions   |                                                                                                               yes |
| Privacy / Security   |                                                             yes (deny by backend, no client-asserted role, audit) |
| Config / Env         |   yes (new optional env: ROLE_SIMULATOR_ENABLED, ROLE_SIMULATOR_SECRET, AUTHZ_ENFORCEMENT, AUTHZ_UNMAPPED_ROUTES) |

## Current Behaviour

Two effective roles (admin|manager vs operatore|operator) as free strings; demo mode trusts the
client's `X-Operator-Role`; privileged sets duplicated in ~10 files; no capability policy, no
versioning, no admin UI for permissions; tools use the legacy requireRole mirror.

## Expected Behaviour

Single system Identity → Role → Capability policy (versioned document) governing GUI, API routes,
Tool Layer and Agnos. Roles Administrator, Supervisor, Doctor, Nurse, OSS (+ legacy Operator and
legacy admin kept for controlled migration). Role Simulator issuing server-signed sessions for
5 identities. Administrator page to view/filter/edit the matrix with impact preview, Save/Apply and
history. Backend enforcement on routes and tools; revocation effective at the next protected call;
audit with identity/role at the time of the action.

## Acceptance Criteria

- AC1: Identity → Role → Policy → Tool discovery → Tool invocation → Backend → Business logic → Audit demonstrated (Doctor 1).
- AC2: Identity → Role → Policy → DENIED for a forbidden capability (OSS 1), both via tool and via direct backend route.
- AC3: Administrator edits a Nurse capability, Save/Apply creates a new version; an already-open Nurse 1 session is denied/allowed accordingly at the next protected call.
- AC4: Tools visible to Agno (`GET /tools`, Agnos catalog) change coherently with identity/role/policy.
- AC5: Historical records keep the identity/role at the time of the action after a revocation.
- AC6: Regression: existing backend suite has no new failures vs the Phase 1 baseline (21 pre-existing); frontend build passes.
- AC7: Client cannot self-assign identity/role/capability when the simulator is enabled (legacy headers refused; role always server-resolved).
- AC8: Admin UI: roles, capabilities by domain, per-role and per-capability views, edit, impact preview, Save/Apply, history — verified in a real browser.

## Test Plan

| Test type                 | Required | Reason                                                                        |
| ------------------------- | -------: | ----------------------------------------------------------------------------- |
| Unit                      |      yes | policy decision, baseline, route matcher, token signing                       |
| Integration               |      yes | route gate + tool hook + policy store on real Postgres                        |
| API                       |      yes | E2E Doctor/OSS/Nurse/Agno/historical flows over HTTP on the real app          |
| Playwright                |      yes | simulator login + Administrator matrix edit/apply (playwright library script) |
| Persistence after refresh |      yes | policy versions persisted; history listed after reload                        |
| Agnos action registry     |      yes | Agnos catalog/execute filtered by policy                                      |
| Voice simulation          |       no | covered by the shared execute gate test                                       |
| OCR/import test           |       no |                                                                               |
| Security/privacy scan     |      yes | self-assigned role attempts, direct route bypass, fail-closed paths           |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (Agno readiness harness, E2E, full suite serial vs baseline)
- screenshots + Playwright trace/video of simulator and admin page
- persistence proof (policy versions after reload)

## Risks

- Schema change (additive table) — requires migration on deploy; nothing is deployed in this task.
- Global route gate touches every catalogued route: mitigated by legacy roles with legacy-equivalent policy and full-suite comparison.
- Patient data scope stays ownership-based (registeredById) for non-global roles — unchanged business logic, documented.

## Gate Status

READY FOR IMPLEMENTATION
