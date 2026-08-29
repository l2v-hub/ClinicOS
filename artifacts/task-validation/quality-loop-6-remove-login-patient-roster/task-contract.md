# Task Contract

## Task

- Title: Quality loop 6 remove login patient roster
- Slug: quality-loop-6-remove-login-patient-roster
- Type: performance/privacy/UX refactor
- Date: 2026-08-29

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | query shape only |
| Agnos AI / Chatbot | yes, navigation lookup |
| Voice | yes, shared Agnos navigation |
| OCR / Import | import completion navigation only |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

After login App downloads `GET /patients` with every patient and retains the roster for the full
session. Global search and appointment forms filter that client-side array, direct hash restore and
Agnos navigation depend on the same download, and the multi-patient vitals screen fans out one full
cartella request per patient. Startup cost and PHI exposure therefore grow with the facility roster.

## Expected Behaviour

Login must not request or retain a facility-wide patient roster. Global/appointment search uses a
debounced bounded server query; direct hash and Agnos navigation use an authenticated single-patient
lookup. Multi-patient vitals loads bounded pages with only the patient and cartella fields required
by that screen. Existing navigation, import completion and edits remain functional and fail visibly.

## Acceptance Criteria

- AC1: authenticated App startup performs no `GET /patients` roster request and has no global
  `Paziente[]` roster state.
- AC2: global search waits for at least two characters, debounces, aborts stale requests, requests
  at most six server results and exposes loading/error/empty states without stale results.
- AC3: AppointmentForm uses the same bounded authenticated search contract instead of receiving all
  patients; edit mode remains read-only and create mode requires a selected patient.
- AC4: hash restoration and Agnos patient navigation resolve only the requested encoded ID and do
  not depend on any prior roster; deleted/forbidden/network failures end the restoring state.
- AC5: name-based navigation from agenda/dashboard/consegne performs a bounded search, selects only
  a unique exact normalized name, and never guesses among ambiguous matches.
- AC6: MultiPatientParametri uses a bounded server page (maximum 25 initially), transfers only
  patient identity plus the cartella fields it renders/updates, and offers explicit pagination.
- AC7: patient endpoints retain `requireOperator`, `private, no-store`, bounded validated inputs and
  parameterized queries; no endpoint becomes an unbounded PHI export.
- AC8: focused tests cover URL/response validation, debounce/stale orchestration or pure equivalent,
  direct lookup and bounded parameter pages; build, regression tests and secret scan stay green.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Search/page URL, response and merge contracts |
| Integration | yes | Auth and bounds on new/read endpoints |
| API | yes | Page limits and minimal projection |
| Playwright | desirable | Search dropdown/hash UX when runtime is available |
| Persistence after refresh | yes | Direct hash lookup |
| Agnos action registry | yes | Patient navigation |
| Voice simulation | no | Voice shares the same Agnos navigation result |
| Security/privacy scan | yes | Removes bulk PHI transfer |

## Evidence Plan

- validation-report.md
- static network-call audit proving no startup roster request
- focused frontend/backend tests
- monorepo build, scoped lint and secret scans
- independent lightweight security and performance reviews

## Risks

- Existing cards navigate by display name rather than patient ID. Exact-name ambiguity must fail
  visibly until those API DTOs carry the patient ID.
- The cartella remains legacy JSON. A bounded projection reduces reads but concurrent partial writes
  still require the existing backend merge semantics; a future normalized vital-sign model is safer.
- Patient ABAC/tenant isolation cannot be inferred from the current schema. This cycle preserves the
  current operator gate and reduces data exposure; it does not claim tenant isolation.

## Gate Status

CLOSED — VERIFIED
