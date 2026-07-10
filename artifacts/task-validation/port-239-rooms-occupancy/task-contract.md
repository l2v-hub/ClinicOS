# Task Contract

## Task
- Title: port-239-rooms-occupancy
- Slug: port-239-rooms-occupancy
- Type: change
- Date: 2026-07-10

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | yes |
| Database/Persistence | no (read-only Prisma queries) |
| Agnos AI / Chatbot | yes |
| Voice | yes (READ_VERB stem only, no downgrade) |
| OCR / Import | no |
| Auth / Permissions | no (aggregate counts only, no cross-patient PHI) |
| Privacy / Security | yes (must stay aggregate-only, never patient names) |
| Config / Env | no |

## Current Behaviour

Issue #239 fix (commit 6a3d984) was implemented on an OLD base branch and never landed on
current `main`. On current `main`, `backend/src/ai/assistant/plan.ts` has no `rooms_occupancy`
intent, so questions like "quante camere sono occupate oggi" fall through to `unknown`/other
intents. Also the therapies stem in `plan.ts` may still be `/terapia|farmac/` (singular-biased)
depending on which parallel branch merged last — needs verification against current main.

## Expected Behaviour

Current `main` gains, ported/adapted (not blindly cherry-picked) from 6a3d984:
1. `rooms_occupancy` AssistantIntent + `query_rooms_occupancy` tool in `assistant/plan.ts`
   (aggregate-only, `requiresCrossPatientAccess: false`).
2. Dispatch in `assistant/service.ts` reading Room/Bed/PatientRoomAssignment via Prisma,
   returning `{totalRooms,totalBeds,occupiedBeds,freeBeds,maintenanceBeds,occupancyPct}`,
   no patient names, active occupancy = assignment with `endDate: null`.
3. `ROOM_OCCUPANCY` added to `SourceType` (gateway/types.ts) + `roomOccupancySource(...)`
   helper (gateway/sources.ts).
4. Plural "terapie" recognized (stem `/terapi|farmac/`) if main still uses the singular-only
   `/terapia|farmac/` stem — only applied where main doesn't already fix it.
5. Regression tests ported into `assistant-plan.test.ts` and `actions.test.ts`, matching
   main's real current shapes (not 6a3d984's).
Nothing that main already has (e.g. an already-expanded voice READ_VERB, or an existing
`unknown`→`runRead` delegation) is duplicated or downgraded.

## Acceptance Criteria

- AC1: `planQuery('Quante camere sono occupate oggi?', {})` returns
  `intent: 'rooms_occupancy'`, `tools[0].tool === 'query_rooms_occupancy'`,
  `requiresCrossPatientAccess === false`.
- AC2: `planQuery('che terapie assume il paziente', { currentPatientId })` returns
  `intent: 'therapies'`, `tools[0].tool === 'get_patient_therapies'` (plural "terapie" matches).
- AC3: `assistantQuery`/service dispatch for `query_rooms_occupancy` returns only aggregate
  bed/room counts (no patient identifiers) sourced from Prisma Room/Bed/PatientRoomAssignment.
- AC4: `backend/src/ai/__tests__/assistant-plan.test.ts` and `actions.test.ts` pass, and
  `npm --prefix backend run build` exits 0.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | assistant-plan.test.ts (rooms_occupancy + plural terapie), actions.test.ts |
| Integration | no | |
| API | no | |
| Playwright | no | scoped backend-only port, no UI change |
| Persistence after refresh | no | read-only aggregate query |
| Agnos action registry | yes | new query_rooms_occupancy tool + SourceType |
| Voice simulation | no | READ_VERB not modified beyond what main already has |
| OCR/import test | no | |
| Security/privacy scan | yes | must verify aggregate-only, no patient names in output |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

<!-- Rischi noti e mitigazioni. -->

## Gate Status

READY FOR IMPLEMENTATION
