# Migration Plan — Phase 1 (done) and next steps

Order of intervention applied everywhere: **REUSE → WRAP → LOCAL REFACTOR → (no REWRITE)**.

## 1. Done in Phase 1

### 1.1 New, additive

| Change                                                            | Files                                                                  | Behaviour impact on existing features                 |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| Tool Layer core (contract, registry pipeline, error model, hooks) | `backend/src/tools/{types,errors,hooks,registry,index,http}.ts`        | none (new module)                                     |
| Domain adapters                                                   | `backend/src/tools/capabilities/*.ts`                                  | none — call existing service symbols                  |
| HTTP surface `/tools`                                             | `backend/src/tools/http.ts`, mount in `backend/src/app.ts`             | new route only, behind `requireOperator` + rate limit |
| Audit channel values `gui/ai/tool/test`                           | `backend/src/ai/audit-store.ts` (type union only; column is free text) | none                                                  |
| Tool tests (invocability + GUI parity)                            | `backend/src/tools/__tests__/*.test.ts`                                | test-only                                             |
| Catalog renderer                                                  | `scripts/ai-architecture/render-capability-catalog.mjs`                | tooling                                               |

### 1.2 LOCAL REFACTOR (handler body moved verbatim, route now calls the shared function)

| Capability                                | From                                                               | To                                                                                                                                     | Guard                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `diary.create`                            | inline handler `routes/patient-diary.ts` POST                      | `patients/diary-write-service.ts#createPatientDiaryEntry`                                                                              | route tests `patient-diary-contract`, `patient-diary-scope-pagination` — same results before/after (2 pre-existing failures) |
| `diary.create_with_therapy`               | inline composition in route                                        | `patients/diary-write-service.ts#createPatientDiaryEntryWithTherapy` (keeps `recordOperationalAudit`)                                  | `patient-diary-therapy-contract`, `patient-diary-therapy-db`                                                                 |
| diary author rule                         | non-exported `authoritativeDiaryAuthor` in route                   | `patients/diary-author.ts`                                                                                                             | same                                                                                                                         |
| intake draft ownership                    | inline lookup in `requireOwnedIntakeDraft`                         | exported `ai/ownership.ts#loadIntakeDraftOwner` (middleware uses it)                                                                   | `ownership.test.ts`, `intake-draft.test.ts`, `intake-confirm.test.ts`                                                        |
| upload MIME constants                     | route-private                                                      | `export` of `ALLOWED_MIME`, `mimeFamily` in `routes/patient-documents.ts`                                                              | document route tests 18/18                                                                                                   |
| administration confirm / not-administered | inline Serializable upsert in `routes/therapy.ts`                  | see §1.3 (therapy agent)                                                                                                               | `therapy-authoritative-write`, `therapy-auth`, `therapy-slot-scope-contract`                                                 |
| `patients.clinical_summary` (post-QA)     | inline composition in `routes/patients.ts` GET `/clinical-summary` | `patients/clinical-summary-service.ts#loadScopedPatientClinicalSummaries`                                                              | `patient-route-scope-contract` (assertion re-pointed), tool parity test                                                      |
| `documents.list` (post-QA)                | inline query parsing in `routes/patient-documents.ts`              | `ai/upload/patient-document-list-query.ts#parsePatientDocumentListQuery`                                                               | `patient-document-pagination` (assertions re-pointed), tool tests                                                            |
| `diary.therapy_preview` (post-QA)         | inline envelope checks in `routes/patient-diary.ts`                | `patients/diary-write-service.ts#previewDiaryTherapy`                                                                                  | `patient-diary-therapy-contract`, `patient-diary-therapy-db`                                                                 |
| `assessments.finalize` (post-QA)          | finalize+PDF composition in `routes/patient-assessments.ts`        | `assessments/finalize.ts#finalizeAssessmentWithPdf`                                                                                    | assessment tool parity test                                                                                                  |
| shared constants (post-QA)                | literals in routes                                                 | `services/farmaci/query.ts#MAX_FARMACI_QUERY_LENGTH` (route re-exports), `routes/ai-assistant-public.ts#MAX_ASSISTANT_QUESTION_LENGTH` | drug/assistant tool tests                                                                                                    |

Source-grep contract tests that asserted code _location_ were re-pointed to the new module with
the same intent (ordering of validation before DB access, no clinical text in logs).

### 1.3 Therapy/administration refactor

- `routes/therapy.ts` POST `/therapy-slots/confirm` and `/therapy-slots/not-administered`: the
  Serializable upsert transactions moved verbatim to
  `therapies/administration-record.ts#recordTherapyAdministration` (with
  `TherapyAlreadyAdministeredError`, `isConcurrentWriteConflict`). Routes keep their exact HTTP
  status/error mapping.
- Inline patient filter exported as `routes/therapy.ts#therapySlotPatientAccess(actor)`; the
  route's `patientAccess(req)` delegates to it.
- Route tests before → after: `therapy-authoritative-write` 3/4 → 3/4 (the failing case is the
  pre-existing "Body is unusable" test bug listed in the baseline), `therapy-auth` 5/5 → 5/5,
  `therapy-slot-scope-contract` 4/4 → 4/4 (one source-grep assertion re-pointed to the new module,
  same intent: writes are resolved through `resolveAuthoritativeTherapy` with the actor).

### 1.4 Behavioural nuances introduced (documented, intentional)

- Diary POST: a non-validation error thrown while parsing the body now returns the route's JSON
  500 instead of Express's default HTML 500 (single try/catch after extraction). No status code of
  a valid or validation-failing request changed.
- `diary.create_with_therapy` stores `operatoreInseritore = actor.name || actor.id` exactly as the
  route; a tool caller's identity name therefore must come from the auth gate (it does over HTTP).
- `administration.list_slots_page` returns the service page without the route-only
  `pageInfo.completeness/summaryExact` decoration.

## 2. Next steps (proposed, NOT done)

### 2.1 For Prompt 2 (roles/authorization) — required

1. Replace `legacyRoleAuthorization` with a policy-registry hook (`setAuthorizationHook`) fed by
   the Role/Capability matrix; keep `legacyRoles` as the migration baseline for
   Administrator/Supervisor.
2. Route-level enforcement: add one `requireCapability('<capability_id>')` middleware next to the
   existing `requireOperator` on each route, using the SAME policy decision function as the tool
   hook (single source of truth). Start with the routes of catalogued capabilities.
3. Identity: server-owned simulated identities (Administrator, Supervisor 1, Doctor 1, Nurse 1,
   OSS 1); stop trusting `X-Operator-Role` from the client in demo mode (role resolved server-side).
4. Centralise the duplicated `{admin, manager}` sets (see TOOL_LAYER_ASSESSMENT.md) behind the
   policy service.

### 2.2 GAP closures (only when a phase needs the capability)

| GAP                                                        | Minimal change                                                                                                                                      | Risk                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Notes (list/create/update/delete)                          | extract handler bodies of `routes/note.ts` into `notes/service.ts`                                                                                  | medium (visibility SQL)                               |
| Consegne update/delete                                     | extract permission matrix + update into `consegne/write-service.ts`                                                                                 | medium                                                |
| Patients create / update demographics / get / cartella get | extract into `patients/patient-write-service.ts` + `patients/patient-read-service.ts`; then point Agnos `update_patient_demographics` to it         | medium-high (CF uniqueness, cartella CF strip)        |
| Therapy update / list / administration history             | extract query builders + schedule-replacement tx                                                                                                    | medium                                                |
| Operators CRUD, schedules                                  | extract + add input validation (currently untyped bodies)                                                                                           | medium                                                |
| Rooms/beds CRUD, room assignments                          | extract (~300 lines with advisory locks)                                                                                                            | high                                                  |
| Agnos divergent writers                                    | `create_vital_sign` → `createParameterReading`; `add_diary_note` → `createPatientDiaryEntry`; `update_patient_demographics` → patient write service | medium (changes AI behaviour; needs product sign-off) |

### 2.3 Hardening backlog (pre-existing, surfaced by discovery)

- `POST /appointments` has no patient-scope check (tool mirrors route).
- `ensureOperator` auto-provisions User/Operator rows.
- Diary `PUT`/`DELETE` without author check or audit.
- In-memory idempotency store and rate limiters (multi-instance unsafe).
