# Task Validation Report

## Task
- Title: port-239-rooms-occupancy
- Slug: port-239-rooms-occupancy
- Commit: (see `git log -1` on branch fix/239-rooms-occupancy-port after commit)
- Date: 2026-07-11

## Implementation Summary

Ported the missing piece of issue #239 (commit 6a3d984, built on an old base) onto current
`main`. Investigation showed main already had MOST of #239 landed via later work:
- `backend/src/ai/actions/orchestrate.ts`: `plan.actionType === 'read' || 'unknown'` already
  delegates to `runRead` (broader than 6a3d984's `unknown`-only delegation). No change.
- `backend/src/ai/voice/plan.ts`: `READ_VERB` already expanded (`quant\w*` etc., broader than
  6a3d984's `quali?|quante?|...`). No change (not downgraded).
- `backend/src/ai/assistant/plan.ts`: therapies stem already `/terapi\w*|farmac\w*|prescriz\w*/`
  (plural "terapie" already matches). No change.
- `backend/src/ai/__tests__/actions.test.ts`: both #239 regression tests (natural-question and
  unknown-text delegation) already present and passing. No change.

Only the aggregate `rooms_occupancy` feature was genuinely missing, so it was added, adapted to
main's real (more advanced) shapes:
- `backend/src/ai/assistant/plan.ts`: added `rooms_occupancy` to `AssistantIntent`, added the
  camere/stanze/letti regex clause → `query_rooms_occupancy` tool, `requiresCrossPatientAccess: false`.
- `backend/src/ai/assistant/service.ts`: added `roomsOccupancy(env)` dispatching to
  `query_rooms_occupancy`, reading Room→Bed→PatientRoomAssignment via Prisma. Gated by
  `canFacilityRead(env)` (env flag `AI_FACILITY_QUERIES_ENABLED`, off by default) — main already
  established this gate for all facility-level (room/bed/occupancy) reads in the 016-F3
  composable query engine (`gateway/query/engine.ts`), so the new deterministic path reuses the
  SAME gate instead of opening an ungated facility-read path. Occupied = assignment active
  (`endDate: null` OR `endDate >= today`), matching the existing `/admin/rooms/occupancy` REST
  route's `activeAssignmentFilter()` convention (`backend/src/routes/admin-rooms.ts`) so the
  chatbot's counts never disagree with the admin panel's. Maintenance beds counted separately,
  never as free.
- `backend/src/ai/gateway/sources.ts`: added `roomOccupancySource()`. Main already had `ROOM` and
  `OCCUPANCY` in `SourceType` (added earlier for the 016-F3 engine) — reused `OCCUPANCY` instead
  of adding a redundant `ROOM_OCCUPANCY` member, for consistency with `gateway/query/engine.ts`'s
  existing `roomAssignment → 'OCCUPANCY'` mapping. `patientId: ''` for the aggregate (no single
  patient owns it), matching the F3 engine's own convention for patient-less facility rows.
- `backend/src/ai/__tests__/assistant-plan.test.ts`: added the one missing regression test
  (rooms_occupancy intent/tool/no-cross-access). The plural-"terapie" regression test already
  existed on main (`016 F0: plural "terapie" is recognized`).
- No new test files were created, so no `backend/package.json` test-list change was needed.

## Files Changed

- backend/src/ai/assistant/plan.ts
- backend/src/ai/assistant/service.ts
- backend/src/ai/gateway/sources.ts
- backend/src/ai/__tests__/assistant-plan.test.ts

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 (rooms_occupancy plan shape) | PASS | `assistant-plan.test.ts` new test, run below |
| AC2 (plural "terapie") | PASS | already present + passing (`016 F0: plural "terapie"...`) |
| AC3 (aggregate dispatch, no patient names, facility-gated) | PASS | code review: `roomsOccupancy()` returns only `{totalRooms,totalBeds,occupiedBeds,freeBeds,maintenanceBeds,occupancyPct}`, gated by `canFacilityRead` |
| AC4 (tests + build green) | PASS | see Test Results |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | `node_modules/.bin/tsx --test backend/src/ai/__tests__/assistant-plan.test.ts` → 23/23 pass; `.../actions.test.ts` → 45/45 pass |
| Integration | PASS | `DATABASE_URL=... npm --prefix backend test` → 317/317 pass (full suite, incl. query-engine/context-facility/assistant-query-data) |
| API | NA | scoped backend-only port, no route change |
| Playwright | NA | scoped backend-only port, no UI change (per task scope) |
| Persistence | NA | read-only aggregate query, nothing written |
| Agnos AI | PASS | new `query_rooms_occupancy` tool + `OCCUPANCY` source wired through plan → dispatch → source |
| Voice | NA | READ_VERB untouched (main's version already broader) |
| OCR | NA | out of scope |
| Security/privacy | PASS | verified aggregate-only output (counts, no patientId/names in the room/bed loop); new facility read reuses the existing `canFacilityRead` env-gate, deny-by-default |

## Runtime Evidence

- `npm --prefix backend run build` → exit 0 (prisma generate + tsc -p tsconfig.json, no errors).
- Full `npm --prefix backend test` (317 tests) → 0 failures.

## Logs

No logs captured beyond the test-runner's own (sanitized) TAP output above; no PHI/secrets involved (read-only aggregate counts, no DB writes).

## Residual Risks

- The deterministic `rooms_occupancy` path is only reached when the LLM planner is OFF
  (`cfg.planEnabled` false) — main's default/fallback path per `assistant/service.ts`'s
  `assistantQuery`. When the LLM planner is enabled, "quante camere sono occupate" could instead
  be routed through the 016-F3 composable engine; both paths are now consistently gated by
  `canFacilityRead` and use compatible occupancy semantics.
- `AI_FACILITY_QUERIES_ENABLED` must be `true` in the deployment env for this feature to answer
  (off by default, same as the existing F3 facility entities) — this is intentional (no
  regression), not a bug.

## Final Decision

CLOSED — VERIFIED
