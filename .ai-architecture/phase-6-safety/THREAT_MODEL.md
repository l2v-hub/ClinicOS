# Phase 6 — Threat Model (Clinical Safety & Adversarial Guardrails)

Scope: everything an attacker, a confused operator, a noisy ward or a misbehaving model can do
to the AI Assistant (text + voice), the Skills engine, the Tool Layer and the classic GUI
routes that share the same services. Assets: correct-resident clinical writes, confidentiality
of resident data, integrity of the audit trail, availability without unsafe fallbacks.

Trust boundaries:

```
browser (untrusted: payload, headers, timing, retries)
  │  simulator token / Entra JWT  ──► identity (server)  ──► policy (DB, versioned) ──► scope (DB)
  │  text / audio                 ──► STT provider (untrusted output)
  │                               ──► Agno runtime / LLM (untrusted output)
  │  documents, notes, diary      ──► stored data (untrusted content, trusted provenance)
  ▼
Skills engine (workflow state, previews)  ──► Tool Layer (policy hook, schema, scope)  ──► services (domain validation, transaction)  ──► Postgres (+ append-only audit)
```

Legend — **Control**: where it is enforced. **Test**: adversarial scenario id
(`backend/src/safety/__tests__/adversarial.test.ts`, matrix in `ADVERSARIAL_TEST_MATRIX.json`)
or the pre-existing suite that proves it. **Residual**: what remains (see §9).

## 1. Identity

| Threat                                                             | Control                                                                                                    | Test                                                                                | Residual                                                                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Identity spoofing via headers (`X-Operator-Id`, `X-Operator-Role`) | `requireOperator`: simulator mode trusts only the HMAC token; Entra only the verified JWT; headers ignored | AUTH-04, AUTH-05, AUD-02; `security.test.ts`, `patient-documents-entra.test.ts` AC6 | Demo header identity in `AUTH_MODE=demo` without simulator (synthetic data only; production refuses demo) |
| Session fixation / forged token                                    | Token signature + expiry verified on every request                                                         | AUTH-04                                                                             | —                                                                                                         |
| Role escalation                                                    | Role resolved server-side from the active policy assignment; never from payload/text                       | AUTH-05, INJ-05                                                                     | Unassigned identities fall back to legacy roles (R-03)                                                    |
| Stale identity (disabled / reassigned user)                        | Policy + assignment re-read (version check) on every protected operation                                   | AUTH-03                                                                             | —                                                                                                         |
| Role switch during a workflow                                      | `engine.execute` re-evaluates capability against the CURRENT role before commit                            | AUTH-03                                                                             | —                                                                                                         |

## 2. Authorization

| Threat                                                  | Control                                                                                     | Test            | Residual                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| Capability bypass via direct tool call                  | Tool Layer policy hook (capability = tool name) on `/tools/:name/invoke`                    | AUTH-01         | —                                                                            |
| Direct API route not in catalog                         | Route gate: uncatalogued route **denied by default** (Phase 6 fix)                          | AUTH-06         | `AUTHZ_UNMAPPED_ROUTES=allow` escape hatch (R-05)                            |
| Revoked permission between preview and commit (TOCTOU)  | Re-check at execute (engine + Tool Layer)                                                   | AUTH-02, AUD-05 | —                                                                            |
| Stale cached policy                                     | `loadActivePolicyCached` checks the active version on every call                            | AUTH-02         | —                                                                            |
| Forged client payload (role, capabilities, `confirmed`) | Fields ignored / schema `additionalProperties:false`; capability from URL; role from server | AUTH-05         | `confirmed:true` on raw `/tools` is a human assertion for GUI callers (R-06) |
| Policy store unavailable                                | `ensureAuthorization` → 503 `authz_unavailable`; Tool hook fails closed                     | FC-03           | —                                                                            |

## 3. Resident / patient

| Threat                                      | Control                                                                                       | Test           | Residual |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------- | -------- |
| Wrong patient (context swapped)             | Workflow bound to resident; context change → workflow CANCELLED                               | RES-01         | —        |
| Ambiguous patient                           | Resolver returns candidates → `NEEDS_CLARIFICATION`, never «most likely»                      | RES-02, VOI-03 | —        |
| Inaccessible patient (name / id)            | Resident Access Scope in search, `/skills/context`, Tool Layer, services                      | RES-03, RES-04 | —        |
| Manipulated resident id                     | Same scope check, 404 indistinguishable from missing                                          | RES-04         | —        |
| Cross-patient leakage via LLM query planner | `scopeToPermittedPatients` in query engine (Phase 6 fix)                                      | RES-05         | —        |
| Documents of residents outside scope        | `requirePatientDocumentAccess` → `requirePatientScope` (Phase 6 fix)                          | RES-06         | —        |
| Another operator confirms my workflow       | Workflow bound to `operatorId`                                                                | RES-07         | —        |
| Scope lookup failure                        | `requirePatientScope` / Tool scope step → 503; services re-check inside the write transaction | FC-04          | —        |

## 4. Agent / Agno

| Threat                                     | Control                                                                                                               | Test                                       | Residual |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------- |
| Tool over-selection / hallucinated tool    | Router output sanitized against the offered skill list; skills map to fixed tools                                     | `test_untrusted.py`, `test_skill_route.py` | —        |
| Tool chaining outside intent               | One skill = one bound tool; writes only via preview → confirm                                                         | INJ-01, INJ-04                             | —        |
| Tool argument mutation after preview       | Preview payload bound (`previewId`); execute uses the stored payload; administration re-checks the slot (Phase 6 fix) | TX-05, AUD-01                              | —        |
| Retry duplication                          | `writeRequestId` fixed at preview; service idempotency                                                                | TX-01, TX-04, TX-06                        | —        |
| Hidden side effects / false success claims | Composer post-check discards action claims (Phase 6); `COMPLETED` only on verified backend result                     | INJ-03, PROV-02                            | —        |

## 5. Voice / STT

| Threat                                    | Control                                                                                                              | Test                | Residual                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| Wrong transcription / wrong number        | Transcript shown and editable; delimited numeric extraction (Phase 6 fix); backend plausibility ranges (Phase 6 fix) | VOI-01, VOI-02      | Plausible-but-wrong values (e.g. 130 vs 150) are only caught by the human reading the preview |
| Noisy environment / TV / radio            | No matching skill → clarification; empty STT → nothing sent                                                          | VOI-05              | —                                                                                             |
| Similar resident names                    | Exact scoped search; ambiguity → clarification                                                                       | RES-02, VOI-03      | —                                                                                             |
| Similar drug names                        | Literal transcription, HIGH_RISK preview, human confirmation                                                         | VOI-04              | Drug free text not checked against the drug registry (R-12)                                   |
| Partial transcript executed               | Only the final transcript is sent, after «Invia»                                                                     | Phase 5 browser E2E | —                                                                                             |
| Accidental trigger / spoken «conferma»    | Voice never confirms; button only                                                                                    | INJ-04              | —                                                                                             |
| Replayed audio                            | Same as any utterance: preview + button; idempotent writes                                                           | TX-01..06           | —                                                                                             |
| Voice for a role without voice capability | `voiceGate` 403 before reading the body                                                                              | VOI-07              | —                                                                                             |

## 6. Prompt injection

| Threat                                | Control                                                                                    | Test                        | Residual |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------- | -------- |
| Malicious note («ignora le regole»)   | Notes are read-only data; writes need preview + button                                     | INJ-01                      | —        |
| Malicious uploaded document           | `fenceUntrusted` + `UNTRUSTED_RULE` in extraction prompts; schema validation; human review | INJ-02                      | —        |
| Resident data containing instructions | Same fencing in runtime plan/compose/skill-route prompts                                   | INJ-02, `test_untrusted.py` | —        |
| Tool output containing instructions   | Results fenced in compose; composer post-check discards override echoes                    | INJ-03                      | —        |
| User trying to override policy        | Role/capability never from text                                                            | INJ-04, INJ-05              | —        |

## 7. Backend

| Threat                                            | Control                                                                                           | Test                                    | Residual                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| Authorization bypass                              | §2                                                                                                | AUTH-*                                  | —                                                                   |
| Race conditions (double confirm)                  | Workflow compare-and-set (`EXECUTING`) + requestId                                                | TX-01                                   | —                                                                   |
| Stale state (prescription changed after preview)  | Administration executor re-check (Phase 6 fix)                                                    | TX-05                                   | Read-back verification only for vitals (R-13)                       |
| Duplicate write from GUI (double click, retry)    | `runIdempotent` on therapy / diary create (Phase 6 fix); frontend `createSubmissionKey`           | TX-02, TX-03                            | In-memory per instance (R-15); consegne `requestId` optional (R-14) |
| Partial transaction                               | Services use one DB transaction per logical write                                                 | FC-04 (in-tx failure → nothing written) | —                                                                   |
| Timeout after successful commit                   | Retry replays (same requestId); UI reconciles the workflow before claiming anything (Phase 6 fix) | TX-04, TX-06                            | Workflow store in memory (R-11)                                     |
| Unhandled async error → hang / crash / stack leak | Catch-all error handler, `guardAsyncRoutes`, `unhandledRejection` logger (Phase 6)                | FC-01, FC-02                            | —                                                                   |

## 8. Audit

| Threat                              | Control                                                                                      | Test                   | Residual                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------- |
| Missing identity / wrong identity   | Identity from the verified session only                                                      | AUD-01, AUD-02         | —                                                         |
| Incorrect role / origin             | Engine audit carries role + channel; operational audit carries the Tool origin (Phase 6 fix) | AUD-01, AUD-03         | `X-Tool-Origin` is caller-declared metadata (R-10)        |
| Missing confirmation record         | `skill:*:confirmation` row with `ui_event` and preview id                                    | AUD-01                 | —                                                         |
| Executed tool not logged            | Tool Layer logs every invocation (ok/denied/error)                                           | AUTH-01, AUD-02, FC-04 | —                                                         |
| Failure logged as success           | Execute audit written after the outcome                                                      | AUD-05, PROV-02        | —                                                         |
| Preview / persisted mismatch        | Proposal row stores the preview id; executor uses the stored payload                         | AUD-01, TX-05          | —                                                         |
| Retroactive change                  | DB triggers: UPDATE / DELETE / TRUNCATE on `AiAuditEvent` refused (Phase 6 migration)        | AUD-04                 | Superuser can drop the trigger (DB operations governance) |
| Body-scoped writes without resident | Audit `patientId` read from body (Phase 6 fix)                                               | AUD-01                 | —                                                         |

## 9. Residual risks (accepted / documented, not fixed in Phase 6)

See `CURRENT_STATE.md` §Residual and `PROMPT7_HANDOFF.md` §Residual risks (R-01 … R-18).
