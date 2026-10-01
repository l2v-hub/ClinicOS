# Phase 6 — Clinical Safety Invariants

Every invariant is enforced on the **backend**; the UI only mirrors it. Each row names the
enforcement point (file / symbol) and the adversarial scenario that proves it.

## A — No ambiguous patient write

Ambiguous or unresolved target → `STOP → NEEDS_CLARIFICATION`. Never «the most likely».

- Enforcement: `backend/src/skills/engine.ts` resident resolution (scoped search returns
  candidates); `backend/src/access-scope/resident-access-scope.ts` `canAccessResident`.
- Tests: RES-02 (same surname), RES-03 (out-of-scope name), VOI-03 (similar non-existent name).

## B — No stale confirmation

A confirmation is valid only for: the same identity, the same resident, the exact payload
(`previewId`), the current policy, the current workflow state.

| Change between preview and confirm                       | Effect                               | Test                                             |
| -------------------------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| Identity (another operator)                              | `workflow_not_found`                 | RES-07                                           |
| Resident in page context                                 | workflow `CANCELLED`                 | RES-01                                           |
| Payload (preview id mismatch / edit)                     | new preview required                 | Phase 3/4 suites (`skills-e2e`, `assistant-e2e`) |
| Policy (capability revoked)                              | `DENIED`                             | AUTH-02, AUD-05                                  |
| Role (re-assignment)                                     | not executed                         | AUTH-03                                          |
| Domain state (prescription changed, slot already closed) | `preview_stale` conflict, zero write | TX-05                                            |
| Policy store unreadable                                  | 503, zero write                      | FC-03                                            |

## C — Human control on sensitive actions

Prescriptions, administrations and other sensitive writes: AI may prepare and preview, never
finalize. Confirmation only by the UI button (`action:'confirm'` + `previewId`); a spoken or
typed «conferma» is refused.

- Enforcement: `skills/engine.ts` (confirm only via action), confirmation classes
  (`SENSITIVE_WRITE`, `HIGH_RISK`).
- Tests: INJ-04 (spoken «conferma» refused), VOI-04 (HIGH_RISK preview, zero write).

## D — Backend truth

The Assistant says «registrato/salvato» only after a verified backend result.

- Enforcement: `COMPLETED` only when the tool returned `ok` (vitals also read back);
  composer post-check `claimsActionOrOverride` discards any LLM prose claiming an action;
  frontend `reconcileWorkflow` asks the server for the real state when the confirm response is
  lost — otherwise «Esito NON verificato».
- Tests: INJ-03, PROV-02, TX-04 (lost answer never reported as success).

## E — Recheck before commit

Immediately before commit the backend re-checks identity, role, capability, resident scope,
payload version and workflow state.

- Enforcement: `engine.execute` (policy + scope + preview id + compare-and-set `EXECUTING`),
  `tools/registry.ts` (policy hook, schema, scope), services (scope inside the write
  transaction), administration executor (slot still `pending`, same drug/dose/route).
- Tests: AUTH-02, AUTH-03, RES-01, TX-05, FC-03, FC-04.

## F — No hidden privilege

No capability outside the configured policy; uncatalogued routes denied.

- Enforcement: route gate default `AUTHZ_UNMAPPED_ROUTES=deny` (Phase 6); capability from the
  tool name; role from the policy assignment.
- Tests: AUTH-01, AUTH-05, AUTH-06, INJ-05, LEAK-02.
- Documented legacy exceptions: legacy-role fallback for unassigned identities, baseline policy
  when no version is active (R-03, R-04).

## G — Safe retry

Retries never duplicate a logical write.

- Enforcement: Skills `writeRequestId` fixed at preview; vitals `(patientId, requestId)`;
  administrations natural slot key + pending re-check; GUI therapy / diary `runIdempotent`
  (`backend/src/lib/idempotency.ts`) with frontend `createSubmissionKey`.
- Tests: TX-01 … TX-06.

## H — Impossible values are rejected, never corrected (Phase 6)

`parseParameterReading` rejects physiologically impossible vitals with the same ranges the GUI
already flags (`ParametriTab` `PLAUSIBLE_RANGES`): PA 40–300 / 20–200 with diastolic below
systolic, FC 20–300, temperature 25–45 °C, glycaemia 10–900, SpO₂ ≤ 100, FR 1–80. A value is
never shortened or re-interpreted («1200/80» is not «200/80»; «375» is not «37,5»).

- Enforcement: `backend/src/patients/parameter-reading-input.ts`, `skills/interpreter.ts`
  (delimited numeric patterns).
- Tests: VOI-01, VOI-02, `parameter-reading-input.test.ts`.
