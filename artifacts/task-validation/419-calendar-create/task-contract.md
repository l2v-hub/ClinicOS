# Task Contract

## Task
- Title: 419-calendar-create
- Slug: 419-calendar-create
- Type: bugfix
- Date: 2026-10-09

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes (existing GUI gate, server unchanged) |
| Privacy / Security | yes (synthetic QA only) |
| Config / Env | no |

## Current Behaviour

Original419 OPEN, no comments. Button excludes past dates/times while daily and weekly slots open the form anyway. Disabled button has tooltip-only reason. Existing form save requires patient, not opening. Base accepted418 d028e1ee4c5c44d96b5005362b28f54e5c05fee1; C:/w-419 sole root application writer.

## Expected Behaviour

Preserve existing operator primary temporal/occupied-slot restrictions, apply consistently to daily/weekly entrypoints with current-clock recheck. Visible reason and empty-calendar guidance; patient selection explained inside creation form. No role policy expansion, backend/Prisma/config/dependency changes. Primary dirty and blocked405/408/410/416 untouched.

## Acceptance Criteria

- AC1 (original): Button and slots respect the same authorization conditions. Daily/weekly pointer and keyboard paths check appointments.create and eligibility. Occupied filtered slots never become free.
- AC2 (original): Primary usable or explicit visible missing requirement. Allowed opens existing form with date/time/operator; past day, after hours, full day and denied role show reason, not tooltip only.
- AC3 (original): Empty state comprehensible creation path. Filter mismatch not called empty calendar. Absent patient remains unselected; visible form guidance explains selection before save.
- AC4 (original): Empty day, populated day, absent patient. Also denied/revoked role, clock boundary, weekly and desktop1150x1004/mobile emulation.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | shared date/time eligibility plus existing agenda/capability tests |
| Integration | yes | focused/component source regressions and full frontend delta vs accepted baseline12failures |
| API | no | |
| Playwright | yes | actual SPA synthetic intercepted APIs, values/console/HTTP, before-after screenshot/trace/video/report |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | AuthZ/XSS/input/deps/config review; diff and actual configured credential scan |

Types and frontend tsc-b/Vite build required. Fresh independent readonly QA in isolated candidate checkout, pre-run recipe/source capture and immutable artifacts, followed by root rerun. Runtime writes are intercepted; no production patient mutations. Any synthetic save requires reload proof. Existing API save/persistence unchanged.

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

Stale clock: minute/visibility refresh and activation recheck. Capability revocation must not reveal stale dialog after restoration. Admin calendar temporal behavior is separate and unchanged. No original PHI audit images published. Exact source-bound deployment READY and compiled-online guarded UI verification before close. Source/proof promotions independently authorized by direct user and root release receipt after fresh QA; no agent publication authority. Preserve every prior immutable evidence and separate each attempt output.

## Gate Status

READY FOR IMPLEMENTATION
