# Isolated backend diagnostic — actual failure reproduced

Exactly one full command ran on merge `e9a6dafca0f4aa6644f45406efa8012df428288b`, Node24.19.0, with owned PostgreSQL16 and the exact Python mock runtime. Migrations, backend compilation, font assets and runtime health passed. Source1985 files remained unchanged.

Actual first phase: **1933 tests,1921 PASS,7 FAIL,5 skipped**; final serialized phase: **51/51 PASS**. Full command exit1. This is not a whole-backend PASS.

## Hosted failure independently reproduced

`patient detail and mutation routes use the same non-enumerating scope guard`, `backend/src/routes/__tests__/patient-route-scope-contract.test.ts:23`, fails with ERR_ASSERTION. Its final regex demands an old Prisma findFirst shape. Current approved `parameters-update.ts:130` scopes a locked SQL Patient read by actor ownership unless facility scope applies; absent rows throw PatientParametersNotFoundError before the Cartella lock/write. The unchanged route checks succeed. This is an obsolete implementation-shape fixture; no product regression is established. Root independently retrieved the same single hosted failure.

## Six additional local extraction failures

These required files exist in the exact Git merge but were omitted from this source-only snapshot. No files were restored and no retry occurred.

- `image/jpeg imports a valid image from a nonzero Buffer offset and composes its page` (`backend/src/ai/upload/pages/__tests__/pdf-images.test.ts`): ENOENT `tests/fixtures/import-page.jpg`.
- `image/png imports a valid image from a nonzero Buffer offset and composes its page` (`backend/src/ai/upload/pages/__tests__/pdf-images.test.ts`): ENOENT `tests/fixtures/import-page.png`.
- `MNA presentation matches UI BMI precision at every threshold without changing snapshot values` (`backend/src/assessments/__tests__/mna-presentation-db.test.ts`): ENOENT `artifacts/task-validation/po-16-giro/backend/legacy-v1/state.json`.
- `real archived PO15 MNA v1 ready retry invokes no renderer and preserves every persisted value` (`backend/src/assessments/__tests__/mna-presentation-db.test.ts`): ENOENT `artifacts/task-validation/po-16-giro/backend/legacy-v1/state.json`.
- `backend registry is generated from the catalog of record (no drift)` (`backend/src/authz/__tests__/policy-model.test.ts`): ENOENT `.ai-architecture/phase-1-capabilities/CAPABILITY_CATALOG.json`.
- `src/tools/__tests__/tool-catalog-consistency.test.ts` (`backend/src/tools/__tests__/tool-catalog-consistency.test.ts`): ENOENT `.ai-architecture/phase-1-capabilities/CAPABILITY_CATALOG.json`.

The missing toolcatalog import prevents its three cases registering and records one file-level failure instead, explaining the net reduction from hosted1935 to local1933. Root reports hosted1929PASS1FAIL5skip and final51/51PASS on Node20; these hosted results remain separately attributed.

## Bounded recommendation and handback

Change only the obsolete scope fixture, with explicit ownership/facility/missing-patient/lock assertions and independent mutation checks; preserve clinical behavior and existing scope suites. Require native CI from the full Git checkout. No local full rerun is needed to repeat extraction failures.

Owned PG container and network were removed, mock process stopped,55432/8432 free and flock released. Baseline ID/running/PID/start/finish/restarts/healthy status all match; only Docker’s naturally rotating Health.Log differs. Raw and normalized handback receipts are both retained. No baseline DB read/write occurred.

STOP: diagnosis complete. All actualFAIL/skips retained. Root owns next implementation/publication/native/Claude decisions.
