# PROMPT 7 — Handoff from Phase 6 (Clinical Safety & Adversarial Guardrails)

Authoritative entry for Phase 7 (Proactive Intelligence). Read with
`.ai-architecture/CURRENT_STATE.json` (phase 6). Phase 6 was hardening, not redesign: the
architecture of Phases 1–5 (Tool Layer → policy → Resident Access Scope → Skills engine →
Assistant → voice channel) is unchanged; gaps were closed with minimal fixes.

## 1. Safety invariants Phase 7 inherits (CLINICAL_SAFETY_RULES.md)

A no ambiguous patient write · B no stale confirmation · C human control on sensitive actions ·
D backend truth · E recheck before commit · F no hidden privilege · G safe retry ·
H impossible values rejected, never corrected.

## 2. Enforcement points (file / symbol)

| Concern                   | Where                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity                  | `backend/src/ai/auth.ts` `requireOperator`; `lib/entra-auth.ts`; `authz/simulator.ts`                                                                                                |
| Policy decision           | `authz/decision.ts` `decide`; `authz/policy-cache.ts` `loadActivePolicyCached` (version check per call); `authz/request-context.ts` `ensureAuthorization` (503 on unreadable policy) |
| Route gate                | `authz/route-gate.ts` `capabilityRouteGate` — uncatalogued routes **denied** (`AUTHZ_UNMAPPED_ROUTES` default `deny`)                                                                |
| Tool Layer                | `tools/registry.ts` `ToolRegistry.invoke` (policy hook → Ajv schema → patient scope → handler → audit)                                                                               |
| Resident scope            | `access-scope/resident-access-scope.ts` `canAccessResident`, `residentScopeWhere`; `patients/access.ts` `requirePatientScope` (also on documents since Phase 6)                      |
| LLM data scope            | `ai/gateway/query/engine.ts` `scopeToPermittedPatients`                                                                                                                              |
| Workflow / confirmation   | `skills/engine.ts` (`converse`, `execute`, preview binding, compare-and-set)                                                                                                         |
| Domain re-check at commit | `skills/executors.ts` (administration slot re-check), services re-check scope inside their transaction                                                                               |
| Idempotency               | Skills `writeRequestId`; vitals `(patientId, requestId)`; `lib/idempotency.ts` `runIdempotent` for GUI therapy / diary create; `frontend/src/lib/submissionKey.ts`                   |
| Value validation          | `patients/parameter-reading-input.ts` (plausibility ranges); `skills/interpreter.ts` (delimited numbers)                                                                             |
| Prompt injection          | runtime `clinicos_ai/agents/untrusted.py` (`fence`, `UNTRUSTED_RULE`); backend `ai/untrusted-prompt.ts`; `ai/assistant/composer.ts` `claimsActionOrOverride`                         |
| Result integrity (UI)     | `frontend/src/components/assistant/assistantApi.ts` `reconcileWorkflow`; `AssistantMode.tsx` outcome-unknown notice                                                                  |
| Fail closed / disclosure  | `app.ts` final error handler; `lib/async-guard.ts` `guardAsyncRoutes`; `server.ts` `unhandledRejection`                                                                              |
| Audit                     | `ai/audit-store.ts` (`recordAuditEvent`, `recordOperationalAudit` with `channel`); migration `20261001090000_ai_audit_append_only`                                                   |

## 3. Threat model

`THREAT_MODEL.md` (identity, authorization, resident, agent, voice, injection, backend, audit) and
`FAILURE_MODE_MATRIX.md` (F1–F28). Every Phase 7 feature must add its rows to both.

## 4. Audit contract

`AUDIT_INTEGRITY.md`: request → proposal (`preview:<id>`) → confirmation (`ui_event`) →
`tool:<name>` → execute, same `requestId`, identity, role, channel, resident. Append-only.
Phase 7 notifications must be audited as **reads** (`kind:'read'`, channel of the proactive
engine), carrying the resident and the rule that fired — never clinical text.

## 5. Wrong-patient protections

Workflow bound to resident and operator; context change cancels; ambiguous → clarification with
candidates; out-of-scope ↔ not found; preview shows the target; voice never picks «the most
likely» resident. A proactive notification about resident X that the user opens must start a
NEW workflow whose resident is resolved by the server (never pre-confirmed, never carrying a
payload from the notification).

## 6. Prompt-injection defenses

`PROMPT_INJECTION_DEFENSES.md`. Any Phase 7 prompt that includes resident data, notes,
documents, handovers or tool output MUST use `fence(...)` / `fenceUntrusted(...)` and include
`UNTRUSTED_RULE`; model output is never authoritative for access, target, payload or
confirmation.

## 7. Safe event patterns for proactive intelligence

- Trigger from **committed** domain events (DB rows), never from model output or transcripts.
- Evaluate the rule under the **recipient's** identity and Resident Access Scope at delivery
  time (not at creation time): scope or role changes in between must suppress the notification.
- Notifications carry ids + a fixed message template; clinical values are fetched on open
  through the normal scoped read path.
- Idempotent per (rule, resident, window): the same condition must not notify twice.
- Delivery failures and provider outages degrade to «no notification», never to an action.

## 8. Operations allowed for proactive notification (read-only)

Overdue / upcoming administrations (scoped), missing vitals for a shift, NEWS2 thresholds from
recorded readings, handover items pending acknowledgement, document import ready for review,
expiring therapies, policy/assignment changes affecting the current user.

## 9. Operations that MUST NEVER auto-execute

Prescriptions (create/modify/suspend), administrations (record / not-given), vitals or any
clinical write, diary entries, handovers, document classification/deletion, patient
create/update/discharge/transfer, policy or assignment changes, confirmations of any pending
workflow, voice-triggered actions. Proactive features may **prepare a preview at the user's
explicit request**; the existing button confirmation remains the only commit path.

## 10. Notification vs action boundary

A notification is information plus a link. Opening it = a read under the current identity and
scope. Any action from it = a normal Assistant / GUI workflow (preview → «Conferma»), with all
Phase 6 re-checks. No «one-tap confirm» from a notification, toast, push or voice prompt.

## 11. Residual risks (accepted / documented)

| Id   | Residual                                                                                                             | Mitigation / owner                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| R-01 | Role Simulator token minting is unauthenticated                                                                      | demo / synthetic data only; production requires explicit flags                       |
| R-02 | Demo header identity (`AUTH_MODE=demo` without simulator)                                                            | synthetic QA only; refused in production                                             |
| R-03 | Unassigned identities fall back to legacy roles (`legacy_admin` grants all); removing an assignment can widen access | impact UI warns; assign every identity explicitly                                    |
| R-04 | Baseline policy applies when no active version exists                                                                | keep an active version in every environment                                          |
| R-05 | `AUTHZ_ENFORCEMENT=off`, `AUTHZ_UNMAPPED_ROUTES=allow` escape hatches                                                | operator-only env flags, never defaults                                              |
| R-06 | `ALLOWED_WITH_CONFIRMATION` on GUI/raw `/tools` trusts the caller's `confirmed:true`                                 | GUI is the human; AI path always goes through the engine                             |
| R-07 | Entra `preferred_username` auto-link to an existing operator                                                         | tenant-restricted; review at Entra rollout                                           |
| R-08 | `prescrittore` is a free-text domain field (author `operatoreInseritore` is server-set)                              | business decision                                                                    |
| R-09 | Legacy role scope editing is admin-only                                                                              | by design                                                                            |
| R-10 | `X-Tool-Origin` is caller-declared (audit metadata only, never authorization)                                        | documented                                                                           |
| R-11 | Skills workflow store is in memory (restart / multi-instance)                                                        | single instance today; committed writes are idempotent; durable store is a follow-up |
| R-12 | Drug names from diary-AI / voice are free text, not matched to the drug registry                                     | HIGH_RISK preview + human confirmation                                               |
| R-13 | Post-write read-back verification only for vitals                                                                    | other writes return the persisted row                                                |
| R-14 | Consegne `requestId` optional                                                                                        | GUI sends one; enforce when the handover API is versioned                            |
| R-15 | GUI idempotency (`runIdempotent`) is in-memory per instance, 24 h                                                    | durable receipt table needs a schema change (ask first)                              |
| R-16 | Production `AUTH_MODE` unset → clinical endpoints 503                                                                | user decision pending                                                                |
| R-17 | Audit sink is best-effort (DB outage loses audit rows, never blocks the clinical write)                              | Phase 1 design; revisit with an outbox                                               |
| R-18 | Legacy monthly parameters grid (`validateParameterMonth`) not range-validated server-side                            | GUI flags out-of-range; the Assistant/new readings path is validated                 |
| R-19 | Plausible-but-wrong values (e.g. 150 heard as 130)                                                                   | only the human reading the preview catches them                                      |
| R-20 | Phase 5 Azure STT (PR #393) blocked on the Azure deployment                                                          | not a Phase 6 dependency; Google STT active                                          |

## 12. Regression commands

```bash
# backend (from backend/, local embedded Postgres, never prod)
NODE_ENV=test AUTH_MODE=demo AI_PROVIDER=mock DATABASE_URL=<local> \
  npx tsx --test src/safety/__tests__/adversarial.test.ts          # 44 adversarial scenarios
AI_PROVIDER=mock DATABASE_URL=<fresh local db> node <run-serial.mjs>  # full suite, serial
# runtime (from clinicos-ai-runtime/)
python -m unittest discover -s tests
# frontend (from frontend/)
npm test && npm run build
# browser (real Vite :5199 + backend :3099 + runtime :8765; seed scripts/assistant + scripts/voice)
node scripts/safety/safety-browser-e2e.mjs --out <dir>        # Phase 6 (18 checks)
node scripts/assistant/assistant-browser-e2e.mjs --out <dir>   # Phase 4 (47 checks)
node scripts/voice/voice-browser-e2e.mjs --out <dir>           # Phase 5 (78 checks)
```

## 13. Constraints Prompt 7 must not violate

1. No autonomous clinical write, ever; the button confirmation stays the only commit path.
2. No new path around the Tool Layer, policy decision, Resident Access Scope or audit.
3. No model output used as identity, role, capability, target resident, payload or confirmation.
4. Every prompt with untrusted content fenced + `UNTRUSTED_RULE`.
5. Every new route catalogued (uncatalogued = 403) and scoped; every new write idempotent.
6. Notifications evaluated under the recipient's current scope at delivery time.
7. Do not relax plausibility ranges, the append-only audit triggers or the fail-closed defaults.
8. Extend `adversarial.test.ts` and `ADVERSARIAL_TEST_MATRIX.json` for every new surface.
