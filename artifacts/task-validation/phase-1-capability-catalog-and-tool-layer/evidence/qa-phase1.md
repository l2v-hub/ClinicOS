# QA Report - Phase 1 Capability Catalog + Application Tool Layer

Worktree: C:/Workspace/ClinicOSHouse-worktrees/capability-layer (feat/capability-tool-layer vs origin/main 76ac4c60, uncommitted)
Reviewer: independent QA (not the author). No application code modified.

## Build / tests (executed by QA)
- backend npx tsc -p tsconfig.json --noEmit: PASS (exit 0).
- Tool tests src/tools/__tests__/*.test.ts on disposable PG 127.0.0.1:54329: 78 tests, 78 pass, 0 fail (17.4 s).
- Related route tests (diary/therapy/documents, 8 files): 50 tests, 47 pass, 3 fail. All 3 fail with
  "TypeError: Body is unusable" in files NOT modified by this branch
  (patient-diary-scope-pagination.test.ts:147,188; therapy-authoritative-write.test.ts:205): status assert passes,
  then "await res.text()" in the assert message consumes the body before res.json(). Same 3 are in the author
  main baseline (evidence/serial-main-failures.txt == serial-branch-failures.txt). PRE-EXISTING.
- ai.read evidence tests (gateway-db, assistant-query-data, consegne-assistant-scope): 7/7 pass.

## 1. Route refactor behaviour preservation
- routes/therapy.ts confirm / not-administered: handler bodies moved verbatim to therapies/administration-record.ts
  (diffed vs origin/main). Same parse, same resolveAuthoritativeTherapy(tx,input,actor), same already-erogata check,
  same upsert create/update fields, same Serializable isolation (administration-record.ts:67,128). Route catch
  blocks unchanged (therapy.ts:122-146, 158-183): identical status codes/bodies incl. both 409 texts. patientAccess
  delegates to exported therapySlotPatientAccess, same derivation (therapy.ts:37-45). PRESERVED.
- routes/patient-diary.ts POST /diary: parse, patientId check, author, create moved to
  patients/diary-write-service.ts:39-57 in the same order. Empty patientId now DiaryWriteInputError, same 400 body.
  Only delta: a non-DiaryWriteInputError thrown by the parser was re-thrown to Express, now 500
  "Errore nella creazione della voce" (patient-diary.ts:67-79). Practically unreachable; benign.
- POST /diary/with-therapy: shape/unknown-key 400s now DiaryWriteInputError, mapped by isTherapyValidationError
  and therapyValidationBody to {error: message}: identical bodies. Validation still precedes DB access
  (diary-write-service.ts:84-88 before :90). Audit call identical. 409/400/500 mapping unchanged
  (patient-diary.ts:241-254). Only console text of non-validation parse errors changed. PRESERVED.
- ai/ownership.ts loadIntakeDraftOwner = exact former inline lambda (ownership.ts:29-35). PRESERVED.
- routes/patient-documents.ts: only export keyword added to ALLOWED_MIME / mimeFamily. PRESERVED.
- ai/audit-store.ts: channel type union widened only (free-string column).
- app.ts: mounts /tools after the global 512kb JSON parser (app.ts:130-140, 212). Nothing else.
- 3 route contract tests edited: re-pointed to moved code; assertions not weakened.

## 2. Tool Layer security
- Identity only from requireOperator (http.ts:34; identityOf http.ts:23-27). Body cannot carry identity/role/scope.
  Demo-mode header role is pre-existing and identical for routes.
- Admin-only: the 3 exposed capabilities behind requireRole(admin,manager) carry legacyRoles
  (operations.ts:83, 107, 134). Hook fails closed (registry.ts:139-155). Other admin routes not exposed.
- Patient scope: every tool whose route uses requirePatientScope has patientScoped true: diary x4
  (diary.ts:58,89,115,157), narrative x3 (narrative.ts:30,51,74), clinical_record.save (patients.ts:223),
  intake.patient_review (patients.ts:301), therapy.create (therapy.ts:204). Registry uses the same
  patientIsInOperatorScope as requirePatientScope (registry.ts:172-190 vs patients/access.ts:15), same 404/503.
  Non-patientScoped tools call actor-scoped services (parameters, assessments, consegne, appointments,
  administration via resolveAuthoritativeTherapy patient.registeredById, slots via therapySlotPatientAccess).
  documents ownership scope is STRICTER than the Entra route (facility-wide) and the demo route (client-supplied
  X-Demo-Patient-Id). Intake reuses loadIntakeDraftOwner + canAccessOwnedResource (intake.ts:299-304).
  assistant.query reuses ctxFromOperator role clamp (assistant.ts:80).
- Hard delete: none reachable. Result: no escalation, scope bypass or delete path found.

## 3. Audit PHI-safety
- Event = tool, kind, requestId, operatorId/role, origin, patientId, input field NAMES (max 20, one nesting level),
  outcome (registry.ts:40-53,124-136; hooks.ts:276-288). No values. Error logs print error.name only
  (registry.ts:199-202). ajv details = path + message. PHI-SAFE.
- Caveats (LOW): patientId and key names come from unvalidated input and are stored before the scope check; key
  names unbounded in length; errorCode computed but not persisted by the default sink.

## 4. Catalog honesty
- 200 entries: TESTED 67, EXPOSED 12, DISCOVERED 121; READY 95 / WRAP 49 / GAP 56. All 67 TESTED case names exist
  verbatim in the referenced test files (scripted check).
- TESTED spot-check: administration.confirm, diary.create, parameters.save_month, rooms.occupancy,
  roster.set_context_default, clinical_record.save, consegne.create, intake.confirm_draft, documents.upload,
  narrative.save, assistant.query, ai.read.get_patient_allergies, ai.read.query_data. All but one assert the
  business outcome (rows re-read from Postgres, server-side author/operatore, foreign patient gives not_found with
  0 rows written, operatore gets forbidden, GUI/tool parity). WEAK: ai.read.query_data
  (assistant-query-data.test.ts:16-23 only asserts typeof number); ai.read.get_patient_timeline only length >= 1
  (assistant.test.ts:166).
- GAP spot-check (5): patients.create (patients.ts:960+), consegne.update (consegne.ts:108+), notes.create
  (note.ts:315+), therapy.update (patient-therapies.ts:245+), operators.create (operators.ts:419+): all genuinely inline.

## Findings (ranked)
1. [MEDIUM] tools/capabilities/documents.ts:205,250-258 + app.ts:130-140: documents.upload advertises and checks
   max 15 MB, but over HTTP POST /tools/:name/invoke the global 512kb JSON parser rejects any base64 body above
   about 380 KB before the tool runs. Tests only call registry.invoke, so this is untested. GUI multipart accepts
   15 MB, so tool/GUI parity is broken for real scans.
2. [MEDIUM] TARGET_TOOL_ARCHITECTURE.md:39 claims no rule is duplicated, yet tools copy route composition:
   patients.clinical_summary (patients.ts:275-291 = routes/patients.ts:213-233, incl. the patientScopeWhere filter,
   a security-relevant drift risk); documents.list query parsing (documents.ts:78-100 = patient-documents.ts:249-270);
   diary.therapy_preview envelope + TODAY_IN_FACILITY (diary.ts:24-34,116-147 = patient-diary.ts:191-222);
   assessments.finalize (assessments.ts:212-218 = patient-assessments.ts:97-100); constants MAX_QUERY_LENGTH
   (drugs.ts:16), MAX_QUESTION_LENGTH (assistant.ts:15). Catalog labels them WRAP (honest) but they should be
   extracted to services as done for diary-write-service.
3. [LOW] http.ts:17-21: X-Tool-Origin is client-controlled; an AI caller can record itself as gui in
   AiAuditEvent.channel. Does not widen access; Phase 2 must not base policy on it.
4. [LOW] hooks.ts:276-288 drops errorCode; registry.ts:40-53,132 unbounded key-name length and patientId taken
   from unvalidated input.
5. [LOW] http.ts:36: /tools shares the importRateLimit bucket (ai/rate-limit.ts:76, 60/min/operator) with
   /ai/actions, /ai/assistant, /ai/jobs, /ai/voice. The drugs.ts:6-7 comment saying tools are not behind that
   limiter is inaccurate.
6. [LOW] Layering: tools import route modules (therapy.ts:217, documents.ts:25-30, assistant.ts:10); importing
   them builds routers/multer as a side effect.
7. [LOW] Doc accuracy: TARGET_TOOL_ARCHITECTURE.md:23 says no route was rewritten (two handlers were delegated);
   administration.confirm rationale says route tests identical before/after (3 contract tests edited, re-pointed).
8. [LOW] Weak TESTED evidence for ai.read.query_data and ai.read.get_patient_timeline.
9. [INFO] POST /diary non-validation parser throw: rethrow becomes 500 JSON. Benign.
10. [INFO] Hygiene: untracked backend/artifacts/ (PDF test byproducts) and CRLF-only diffs in run-claude-queue.ps1,
    start-claude-team.ps1 must not be committed.
11. [INFO] 3 pre-existing route test failures (Body is unusable), identical on main.

## Verdict: READY FOR QA
No blocking defect: refactored route behaviour preserved, no security escalation / scope bypass / delete path,
audit PHI-safe, tsc clean, tool tests 78/78. Fix finding 1 before an orchestrator relies on documents.upload over
HTTP; finding 2 is debt against the stated contract. The author validation-report.md states CLOSED - VERIFIED;
this independent review does not endorse done. Status is READY FOR QA with findings 1-2 open.
