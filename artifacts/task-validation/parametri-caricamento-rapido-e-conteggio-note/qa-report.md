# Independent QA — faster parameter entry and daily note count

Reviewer: `patient_loading_qa`, 2026-09-22.
Baseline: `0f4524043bc0c6c762f48fb1a07a85b111a1c79d`.
Final candidate source SHA-256: `5470d1f929e1fc068eb64314228531606079701c26204d625961803e51a2a2d5`.
Source manifest: `qa-source-manifest.json` (819 build/test inputs, 12 changed/new candidate files).
Harness, browser evidence, screenshots and log aggregate SHA-256: `f52675cfdd239a44ba47497fb3f86ffa6f00f713abd75faaf8bf021374d2f90d` (26 evidence inputs).

## Gate phases

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | `task-contract.md`, AC1–AC5 |
| 1 Diff/lifecycle/SQL | PASS | All three findings resolved and reviewed below |
| 2 Tests/builds | PASS | 14 frontend tests, 18 backend/isolated DB tests, frontend types and production build, backend compilation |
| 3 Browser | PASS | Independent review of `browser-evidence.json`, 34 successful assertions and all 8 screenshots |
| 4 Security | PASS | Scope/auth/SQL/privacy audit below |

## Draft-retention finding — resolved

The earlier candidate replaced all rows with the first refreshed page, dropping a draft on patient 26 after 27 rows had been loaded. The final `MultiPatientParametri` refresh now fetches enough bounded pages to cover the previously loaded count for the same filter, merges intermediate results into still-mounted rows, and finalizes membership only when that refresh finishes. Failed load-more requests retry the same cursor through `loadMore`. The load-more control is disabled during multi-page metadata refresh, avoiding overlapping pagination.

Independent source review confirms that intermediate failures retain the later rows. The final browser record confirms 27 unique rows, a later-page draft surviving day rollover with failed metadata, then successful refresh of both loaded pages with the draft still present. No remaining blocking finding.

## Initial findings verified as fixed

1. Late save responses now pass through `applySavedParameterSummary`, which respects a newer same-day count both when applying metadata and save responses. The current item and saved summary map cannot be blindly replaced by a lower same-day save count.
2. Day rollover resets only daily metadata through `resetParameterDay`, retaining patient identity/component keys. Yesterday's note/read counts are unknown while today's metadata is pending or unavailable. The later-page refresh correction now also preserves those rows through the eventual multi-page response.

## Independent execution

- `node --import tsx --import ./scripts/stub-css-loader.mjs --test frontend/src/lib/__tests__/patientParametersPage.test.ts frontend/src/lib/__tests__/patientParameterReadings.test.ts frontend/src/lib/__tests__/parameterEntrySummary.test.ts frontend/src/components/operator/__tests__/parameterNotes.test.ts`: **14 PASS, 0 FAIL**; `qa-frontend-tests.log`.
- `node --import tsx --test backend/src/patients/__tests__/parameter-reading-input.test.ts tests/integration/parameter-readings-db.test.mts`: **18 PASS, 0 FAIL**; `qa-backend-tests.log`.
- Frontend: `node ../node_modules/typescript/bin/tsc -b --pretty false`: **exit 0**; `qa-frontend-types.log`.
- Frontend: `node ../node_modules/vite/bin/vite.js build --manifest --outDir ../artifacts/task-validation/parametri-caricamento-rapido-e-conteggio-note/qa-production`: **exit 0**; `qa-frontend-build.log` and `qa-production/.vite/manifest.json`.
- Backend: `node ../node_modules/typescript/bin/tsc -p tsconfig.json --pretty false`: **exit 0**; `qa-backend-build.log`.
- Scoped `git diff --check`: **exit 0**.

The backend npm build normally performs Prisma generation then TypeScript compilation. The existing shared Prisma client was retained, because this task changes neither the Prisma schema nor generated model contracts. Its compatibility was independently exercised by backend compilation and the real production queries/API against a freshly migrated local PGlite database. No shared client regeneration, install, schema migration against a remote database, or lockfile edit was performed. Frontend build warnings about an existing large shared chunk and the test loader's Node deprecation warning are non-failing and are not claimed resolved here.

After the final pagination correction, QA independently repeated all 14 frontend tests, frontend type checking and the production build; all passed. SHA-256 comparison of 368 backend/Prisma/fixture inputs found zero changes since the successful 18-test backend run, so that evidence remains applicable without an unnecessary DB rerun.

## SQL and compatibility review

- `view=entry` is explicitly validated and opt-in. Its projection returns an empty monthly payload; the default path retains the previous monthly JSON allowlist and shape. The DB test compares default and entry patients/counts and confirms the default monthly payload remains populated.
- The materialized patient-page CTE applies operator scope, search predicates, cursor and limit before monthly extraction/daily aggregation. Shared normalized alphabetical ordering is used both in selection and final ordering. No unbounded per-patient HTTP requests are introduced.
- Daily count, latest reading and note count are calculated together over immutable reading rows, bounded to Europe/Rome day intervals. The tests cover normal midnight and 23/25-hour DST boundaries, paging, duplicate prevention, HTTP no-store headers, out-of-scope access, idempotent replay and disk reopen persistence.
- `noteCount` counts string notes with non-empty `btrim`. PostgreSQL `btrim` alone strips ordinary spaces; the existing input parser already uses JavaScript `.trim()` and omits wholly blank notes, including tabs/newlines, before persistence. Thus reachable application-created values satisfy this predicate. The new test includes whitespace-only input through the real service. No migration or assumption about arbitrary manually injected invalid historical JSON was introduced.
- `noteCount` is additive in responses; the frontend save parser permits absence for older backend compatibility and rejects invalid negative, fractional or greater-than-reading-count values when present.

## UI, freshness and safety review

- Initial unfiltered identity reads run immediately in parallel with bounded daily metadata. Room/name searches continue using the authoritative parameter endpoint, preserving room-search semantics. Search input changes remain debounced.
- Daily metadata controls membership/cursor. A fast fallback identity page does not overwrite a completed detailed page. Abort signals and generation checks reject late search/day responses. Unknown note/room metadata is explicitly identified, rather than reported as zero or unassigned.
- Saved note counts are distinct from reading counts; a trimmed local note contributes one visibly marked draft. Successful saves use the authoritative server summary. Uncertain saves retain the immutable request identity and draft for retry; no optimistic note-count increment occurs.
- No authorization, CORS, environment flags, AI paths, dependencies or storage permissions changed. SQL remains parameterized. Existing real service authentication and ownership checks remain active. New helper code introduces no raw HTML or patient payload logging.
- All DB writes during QA occurred in the fixture's newly allocated loopback-only PGlite database. The fixture explicitly replaces inherited DATABASE_URL before loading Prisma. Test identities and notes are synthetic; no production data was touched. No new persistent application patient cache was added.

## Independent browser artifact review

QA read `browser-evidence.json` and visually inspected all eight PNGs in `screenshots/`. Browser execution was performed by root through the supported CUA Playwright API, serialized while QA owned filesystem writes. This phase is an independent review of those persisted artifacts, not a second independent browser execution.

- The final desktop screenshot shows four saved notes as a `4` badge; the draft screenshot shows `4*` with explicit text distinguishing three saved notes from one draft.
- The early-row screenshot shows usable entry fields and pending room metadata while daily data is still loading. The error screenshot keeps rows visible and offers retry without fabricating zero note counts.
- Both mobile screenshots retain the two-column form within the viewport; the expanded note editor exposes saved-note count, history action, label and textarea without clipped application controls.
- All 34 recorded assertions pass, including save before metadata, reload, uncertain-save replay without duplication, room search, search races, failure/retry, 25-to-27 pagination, failed next-page retry and later-page draft preservation across rollover/refresh. Recorded application error arrays are empty.
- Root reported a 3-second CUA tool timeout followed by successful DOM assertions. This is a tool timing limit, not evidence of an application exception; final DOM results are the assertions recorded in the evidence file.

Controlled performance measurements use 500ms identity latency and 1,600ms daily metadata latency. The baseline row appears at 1,911ms; final candidate row at 538ms. Initial request starts at 260ms versus 3ms. These numbers quantify the controlled fixture only and do not claim real production latency. Earlier candidate observations remain labeled separately; `candidate-final` records the final pagination implementation.

Trace/video export is unavailable in the supported CUA API, as declared in the task contract. No fabricated trace/video is supplied. The source manifest binds the actual harness/build assets, browser evidence and screenshot bytes.

## Acceptance criteria

| AC | Result | Evidence |
| --- | --- | --- |
| AC1 | PASS | Immediate initial request, debounced search, early identities, explicit metadata errors and retry in source/browser record |
| AC2 | PASS | Entry/legacy DB projection test, 25-row bound, scoped API/no-store tests, no per-patient opening fan-out |
| AC3 | PASS | Note rendering tests, whitespace/draft/saved/reload/uncertain retry browser assertions and screenshots |
| AC4 | PASS | Monotonic summary helper tests, late-response checks, DB idempotency/concurrency tests, final multi-page rollover/draft browser checks |
| AC5 | PASS | Final source/evidence manifest, independent builds/tests/security review and controlled before/after browser artifacts |

## Final verdict

**READY FOR CODEX QA.** All mandatory phases pass within the supported evidence contract; the three actionable findings are resolved. This verdict binds the final source SHA-256 above. Root receives filesystem writer ownership after this report. QA edited only task evidence/build output, not application/tests. No commit, push, deploy or external messages were performed by this QA session.
