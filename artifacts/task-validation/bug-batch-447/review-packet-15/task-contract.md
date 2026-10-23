# Task Contract

## Impact Classification
One obsolete backend source-contract fixture. Test-only correction, no product/config/dependency/runtime changes. Small bounded implementation delegated to Luna; separate6.1 verification.

## Current Behaviour
PR497 a3dedfd67193bb3bb26482ab630053766352c48b native gate backend failed. Actual native diagnostic run39700640337/comment6329770988 identified one test: patient detail and mutation routes use the same non-enumerating scope guard. Prior native1935 tests1929PASS1FAIL5skip plus51PASS. Test requires obsolete findFirst/patientScopeWhere source shape in parameters-update.ts. Approved current product instead performs a transaction-scoped Patient SELECT, conditional registeredById predicate based on hasFacilityPatientScope(role), FOR UPDATE OF p and PatientParametersNotFoundError before Cartella access. Detail/cartella/PATCH/DELETE route guards remain present. Separate full-suite runtime diagnosis is in progress on a DIFFERENT immutable snapshot; do not touch it or its resources/proofs.

## Expected Behaviour
Update only existing obsolete fixture assertion to protect the actual locked scoped lookup. Preserve every existing route guard and non-enumerating/server-authoritative ownership assertion. The test must reject removal of the scope predicate, its conditional role check, the row lock, and missing-patient rejection before Cartella access. Do not weaken test to a token/import-only check, skip it, or change product to satisfy an obsolete regex.

## Acceptance Criteria
Exactly one scoped test file changed; runtime/config/dependencies and prior media/proofs byte identical. Existing two tests PASS on existing source, and independent private mutation probes show the corrected assertion detects each security regression. No new runtime or DB required for this pure readFile source-contract test. Preserve all14 actual attempts and actualClaude1/E2E provenance; native checks on new exact head mandatory before Claude2.

## Scope
ONLY backend/src/routes/__tests__/patient-route-scope-contract.test.ts under /tmp/clinicos-497-native-backend-fixture14; output /workspace/.clinicos-cloud/497-native-backend-fixture14-20261022. No Git/index/canonical/GitHub/provider edits; no SQL/Docker/browser/HTTP/install/dependency/cache writes. Read existing source and existing fixtures only. Do not edit existing diagnostic or QA snapshots. Root alone publishes a checked one-file diff.

## Test Plan
Use trusted stripped verification runner, PATH-only parent with no DATABASE_URL or real credentials, existing tsx/node dependencies. Run existing target file only, no entire DB suite under this grant. Record exact source hashes, actual command/log/result, rationale. Independent agent separately validates pure target plus scope/byte identity and mutation sensitivity; the root will decide whether additional existing full backend runtime is justified by new failures/source changes. Native six remain mandatory.

## Evidence Plan
/workspace/.clinicos-cloud/497-native-backend-fixture14-20261022: canonical reservation/readback before author session, contract, source freeze/diff, actual logs, summary, STOP and seal. Retain actual native failure and currently active independent runtime attempt. No review/deployment/issue closure claim.

## Gate Status
READY FOR IMPLEMENTATION after canonical reservation readback.
