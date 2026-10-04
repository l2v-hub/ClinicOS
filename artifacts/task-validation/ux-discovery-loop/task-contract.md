# Task Contract

## Task
- Title: UX discovery loop
- Slug: ux-discovery-loop
- Type: refactor / bugfix
- Date: 2026-10-04
- Baseline: 750b0a03; application f4a31fe
- Authorization: autonomous frontend fixes, maximum 10 cycles; prior push to l2v-hub/ClinicOS and frontend publication authorized. Backend/database release authorization remains pending.

## Impact Classification
| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes (preserve gates) |
| Privacy / Security | yes (review / synthetic evidence) |
| Config / Env | no |

## Current Behaviour
Screenshot predates current three-view therapy navigation. Expanded prescription list and calendar repeat schedule context. Discovery covers code/browser of therapy, patient, dashboard and routing. Legacy backend lacks shared handover acknowledgement and exact shared urgency counts.

## Expected Behaviour
One therapy plan combines collapsible programming and day/week dose calendar retaining fields, documents and authorized actions. Repair evidenced interactions without changing clinical decision logic, APIs, permissions or live records. At most10 discovery/correction/verification cycles; stop when selected regression surface stable. Bounded discovery does not prove absence of all bugs.

## Acceptance Criteria
- AC1: One plan/history/role-gated creation. Collapsible programming retains quantities, weekdays, dates, type, route, prescriber, notes, AIFA documents/actions; deep links reveal target.
- AC2: Corrected bugs have reproducible findings and focused verification; clinical identity, permissions and failure safeguards retained.
- AC3: Responsive checks390/768/1074/1395 retain controls without document overflow; accessible navigation and collapse/expand.
- AC4: No fabricated read receipts, exact counts or successful mutations. Unavailable backend capabilities explicit.
- AC5: Ledger records at most10 cycles, exact inputs/findings/fixes/evidence/limitations. Independent QA before publication.
- AC6: Focused tests/TypeScript/Vite pass. Push scoped/PHI-safe; live verification read-only.

## Test Plan
| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Routing/schedule/interaction regressions |
| Integration | yes | Real app/component behavior |
| API | no | No server changes; failures mocked |
| Playwright | yes | UI/collapse/roles/errors/responsiveness |
| Persistence after refresh | yes | URL/navigation; synthetic writes only |
| Agnos action registry | no | No assistant changes |
| Voice simulation | no | No voice changes |
| OCR/import test | no | No import changes |
| Security/privacy scan | yes | Roles/scope/fixtures/secrets |

## Evidence Plan
Cycle ledger/exact diff, focused tests/build, synthetic screenshots/trace/video, independent QA, release receipt/sanitized live DOM. No real patient content/secrets/env committed. Ruflo tools/CLI unavailable: native read-only discovery agents; root sole application writer. No local lease adapter found in scoped instructions. Preserve unrelated work/evidence.

## Risks
Keep due-dose actions visible/full prescription details/old links/authorization. Shared handover backend release outside contract. Discovery bounded.

## Gate Status
READY FOR IMPLEMENTATION
