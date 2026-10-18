# Route #486 implementation handoff

Candidate: `/workspace/ClinicOS/agent-team/.worktrees/bug-batch-447`

Base HEAD: `e14ee2f22c18f1026c63e53b5ce0f5744fb0cfe1` (unchanged; no commit made).

Reservation: round 5, nonce `b9c47bef-ce58-4251-b08d-9a75c3bfd8ea`, as recorded in the root-owned reservation receipt.

## Changes

Only the declared #486 paths were edited. All nine edited files had hardlink count 1 before editing; there was no shared historical inode to detach.

- `frontend/src/components/operator/cartella/TherapyFormFields.tsx`: a new manual therapy starts with an empty route.
- `frontend/src/components/operator/cartella/__tests__/therapyRouteRegime.test.ts`: verifies blank initial route, blocked diagnostics, explicit operator selection, and route retention through form changes.
- `frontend/src/components/operator/cartella/__tests__/drugPackageSelection.test.ts`: verifies AIFA package selection never infers a route, operator route survives package/form changes, and explicit/absent/unknown discharge routes remain exact or reviewable.
- `backend/src/therapies/therapy-create.ts`: validates a nonblank explicit route at the new-create boundary and no longer writes the oral fallback. The status/edit scalar validator and schema were not changed.
- `backend/src/therapies/__tests__/therapy-create.test.ts`: pure create-boundary test for absent, blank and explicit routes.
- `backend/src/routes/__tests__/patient-diary-therapy-contract.test.ts`: keeps existing valid diary fixtures explicit and tests that missing/blank route is rejected; other valid schedule fixtures remain unchanged in meaning.
- `backend/src/intake/__tests__/confirm-therapy-validation.test.ts`: adds missing and blank route to the validation-before-write cases.
- `backend/src/tools/capabilities/therapy.ts`: declares `viaSomministrazione` required for `therapy.create` and says to use only explicitly supplied or operator-selected routes.
- `backend/src/tools/__tests__/therapy.test.ts`: adds a route-less create rejection assertion (DB-backed test not run under the assigned no-DB boundary).

No AIFA route inference was added. No parent #481/#483 commits were imported; no other UX447 issue behavior, dependencies, database, browser state, Git state, or provider state was changed.

## Verification

- Focused frontend route, package-selection, and approved #453 warning tests: **23 passed**.
- Diary therapy contract suite with `AUTH_MODE=demo NODE_ENV=test`: **18 passed**. With no explicit test auth mode, the suite's unauthenticated route test returned 503 instead of its expected 401; setting the repository's supported demo test mode resolved this setup-dependent failure.
- Intake confirmation validation suite: **6 passed**.
- Pure shared-create validation test, with a dummy unreachable `DATABASE_URL` solely to satisfy Prisma module initialization: **1 passed**. No database connection was attempted.
- Backend `tsc --noEmit -p tsconfig.json`: **passed**.
- `git diff --check`: **passed**.
- Static tool-schema probe: `therapy.create` requires `viaSomministrazione` (**passed**).
- Frontend TypeScript check: **not run**; `frontend/node_modules/.bin/tsc` and any shared `tsc` executable are absent. Dependency installation was outside this continuation's authorization.
- DB-backed tool test, frontend production build, Prisma generation, browser/E2E and full eight-issue QA: **not run** under this bounded continuation; defer to serial root integration and fresh QA.

## Review point for integration owner

`prepareDiaryTherapyInput()` performs strict create validation before `createDiaryEntryWithTherapy()` looks up an existing `requestId`. The latter's `replayMatches()` still contains the historical `viaSomministrazione || 'orale'` comparison, but an old replay payload that omitted route will now be rejected before reaching it. The diary replay service is outside the authorized #486 file map and remains untouched. Decide whether strict route-less legacy replay is a supported compatibility contract; if it is, make a narrowly guarded, separately authorized change in the replay path and add an exact pre-existing replay regression. New route-less creates must continue to fail before writes.

## Frozen working diff

SHA-256 of `git diff --binary` at handoff: `c5a8e29e322df26b9d7397aa29eadb4e8f9946df74cd34b712feeffc599de4bd`.

The worktree remains uncommitted for root-owned serial parent integration and subsequent independent QA.
