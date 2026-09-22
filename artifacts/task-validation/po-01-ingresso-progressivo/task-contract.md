# Task Contract — PO-01 ingresso progressivo

## Impact Classification
High: patient identity, creation transaction and nullable date of birth. Explicitly approved product plan, including required schema/API changes. Baseline af48e322d3ba99561949f4a7901290e3cace09db. Preserve all previous fixes and unrelated files.

## Current Behaviour
CF, phone and DOB are required during intake; the database already permits null CF/phone but not DOB. Confirmation checks outside transactions leave a concurrent duplicate race. Imported unverified therapies must remain separate from confirmed prescriptions.

## Expected Behaviour
Allow manual/OCR intake with first/last name and authenticated care ownership. Missing DOB, CF and phone stay null and visibly incomplete. Provided values remain validated; fiscal identity remains unique. Later completion updates the same patient. Atomic/idempotent confirmation must converge across draft/job paths and retain clinical/source records.

## Acceptance Criteria
1. Missing CF/phone/DOB permits entry, without invented values or misleading age/date rendering.
2. Invalid provided identity/contact values and existing CF are rejected, including completion of a previously incomplete profile.
3. Double submit, concurrent confirmation and timeout replay produce one patient, including linked OCR job/draft.
4. Incomplete status lists missing fields and provides access to their editors; completing them clears the status on the same record.
5. Ownership/department scope and therapy/allergy review guards are preserved. Excluded imported therapies remain in the retained draft and are not executable.
6. Isolated DB/API tests, frontend regression tests, builds, browser manual/OCR flows and a read-only live smoke pass before closure.

## Test Plan
Use an isolated PGlite fixture with repository migrations; never inherited external DATABASE_URL. Test creation with absent values, malformed dates/CF/phone, duplicates and idempotency/concurrency, completion and scope. Verify visible empty/missing states, acceptance gates, autosave/retry, same patient identity and clinical-data retention. Compile both projects after Prisma generation.

## Evidence Plan
Bind source manifests, commands, outcomes and synthetic browser screenshots to this task. Deployment exports must come from the reviewed commit. Record migration/backend success before frontend publication. No live patient mutation. No clinical validation claims.

## Gate Status
READY FOR IMPLEMENTATION

Policy decision ALLOW: implement PO-01 across relevant frontend/backend/Prisma/tests; root integration owner controls shared manifests and schema. New migration only removes DOB NOT NULL and introduces any demonstrated idempotency metadata needed; do not rewrite existing data. User explicitly authorizes push and deploy of validated plan changes on existing ClinicOS demo services. Security audit follows relevant input/scope/idempotency paths.
