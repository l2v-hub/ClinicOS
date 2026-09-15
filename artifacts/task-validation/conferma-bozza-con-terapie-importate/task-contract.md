# Task Contract

## Task
- Title: Conferma bozza con terapie importate
- Slug: conferma-bozza-con-terapie-importate
- Type: bugfix
- Date: 2026-09-15
- Base: 85affa8af305726e2357ee944d1e5e7669b3aa0a

## Impact Classification
| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | transactional behavior tested, no schema change |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | confirm persistence only |
| Auth / Permissions | no change |
| Privacy / Security | yes |
| Config / Env | no credential changes |

## Current Behaviour
User screenshot reports generic transactional draft-confirm failure. Read-only live ImportAudit classification shows latest six failures are schedule_unit_invalid. Independent source reproduction confirms dischargeRowToTherapyInput always sends administrationUnit empty and quantity1/1 for imported scheduled drugs; strict server validation rejects it. Edited per-time quantities are lost during raw-row roundtrip. Recap reads manual schedule.orario instead of schedule.time. Imported blank-name rows are silently filtered at confirmation. Only synthetic values are used in tests; screenshot clinical text is not copied.

## Expected Behaviour
Preserve explicitly reviewed therapy data through draft reload and confirmation. Legacy parsed imports derive quantities, units and times only when supported by explicit values; incomplete/ambiguous rows stay editable and block confirmation with row-specific instructions. No arbitrary drug/form/quantity assumptions or silent row deletion. Return validation errors as client errors, preserve atomic rollback and retry idempotency. Existing draft remains usable after deployment.

## Acceptance Criteria
- AC1: Named synthetic imported therapy with explicit schedule/fraction/unit reaches createTherapyInTx validation and persistence; no empty unit or default1 overwrite.
- AC2: Reviewed schedules, differing quantities, strength/form, dates, weekdays and therapy type/status survive serialization/reload and confirmation mapping. Unknown legacy clinical values require review.
- AC3: Missing drug or invalid schedule produces visible indexed correction feedback before network submission, with navigation back to Clinica; no silent filtering. Recap uses actual schedule.time (legacy orario fallback if present).
- AC4: Backend known therapy input/date/schedule errors become actionable400 validation messages, not generic503. Invalid therapy rolls back patient creation; successful retry is idempotent. Unknown errors remain sanitized.
- AC5: Focused synthetic tests, regression frontend suite, frontend build/backend TypeScript and independent QA pass; scoped commit/push and existing-site delivery verified.

## Test Plan
| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Raw/reviewed mapper, fractions, per-time units, legacy ambiguity, date/time checks, recap. |
| Integration | yes | Real confirmDraft with transaction stub exercising rollback/retry and createTherapyInTx; isolated local DB if available, never live patient writes. |
| API | yes | Known validation error400, unknown errors sanitized; existing auth preserved. |
| Playwright | yes | Synthetic fixture for invalid/corrected/reloaded review and confirm outcome, root CUA serialized. |
| Persistence after refresh | yes | Serialized draft fixture and successful confirmation reload; database evidence only if isolated DB provisioned. |
| Agnos action registry | no | Unchanged. |
| Voice simulation | no | Unchanged. |
| OCR/import test | confirm only | No provider calls or credential changes needed. |
| Security/privacy scan | yes | No clinical payload or credential logging; safe audit classification. |

## Evidence Plan
Sanitized diagnosis with category counts only, source/diff manifest, focused and regression results, independent reviewer/QA reports. CUA screenshots when supported, DOM/value assertions otherwise; prior live screenshot transport returned blank crops, which must not be claimed as evidence. QA fixture DEV+loopback, synthetic data only. All artifacts under this task directory and excluded from production upload.

## Ownership and Policy Receipt
ALLOW: user explicitly requests fix of screenshot failure; earlier explicit push/publish authorization persists for corrections to this delivery. Root sole writer in isolated application worktree subtle-dashboard-notifications; researcher read-only, independent QA separate snapshot. Original checkout, unrelated launchers and existing5176 server preserved. No automatic confirmation of user patient/draft, no clinical live writes, no secret changes, no force push, no main merge. Existing Railway demo backend and Vercel target only after QA; no runtime change required. Read-only SSH diagnosis queried six recent confirm_failed audit details in process memory and emitted category/timestamps only. Ruflo recall/guidance inspected; exact local policy/source receipt maintained.

## Risks
Never invent compressa or dose1 to bypass validation. Legacy raw drafts may need explicit correction; preserve data and show how. Unknown server errors remain generic. Transactionality is mandatory. No unrelated clinical workflow refactor or dependency changes.

## Gate Status
READY FOR IMPLEMENTATION
