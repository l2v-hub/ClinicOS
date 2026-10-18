# Task Contract

## Task
PR483: Correct both actual Claude clinical findings: explicit refused-dose correction with stale-state/idempotency protection; show ambiguous one-off prescriptions through a typed read-only verification category across SQL/read feeds/calendar/dashboard/assistant, without inventing clock, dose or administration action.

## Impact Classification
Explicit owner-authorized review corrections on existing entity, base 34c865233df53a3930f29c8b7befc02208588d64. Backend/API and frontend scope is explicitly authorized where listed below. User approved continuation beyond four preserving all previous attempts and reports. No fake new batch or reset.

## Current Behaviour
Claude requested changes on the pinned base. Prior implementations and evidence remain historical. Root has sole controller/GitHub ownership; automatic competing writers remain paused. Source edits begin only after a durable continuation reservation has been verified.

## Expected Behaviour
Correct both actual Claude clinical findings: explicit refused-dose correction with stale-state/idempotency protection; show ambiguous one-off prescriptions through a typed read-only verification category across SQL/read feeds/calendar/dashboard/assistant, without inventing clock, dose or administration action.

## Acceptance Criteria
AC1 explicit Somministra ora alone requests expectedStato=non_erogata; server requires actual refused record, authorized scope, authoritative dose, one receipt/idempotency, missing/stale/already given denied. AC2 verification is separate discriminated read-only group with null clock/band/dose and no administration action; malformed/missing/conflicting/multiple schedules exactly one item/day. AC3 H:MM normalizes consistently TS/SQL/read/write; calendar classifies once before schedules; periodic multidose preserved. AC4 exact summaries and paginated candidate/feed merging match full details with ACL and no duplicate, assistant/visible Agnos/dashboard/calendar/agenda/week/turno show verification separately, all-clear accounts for it. AC5 all seven issue regressions remain true on new source; actual browser+SQL+media for correction and ambiguity. AC6 zero old proof mutations, no invented clinical routes or doses.

## Scope
backend/src/therapies/{slot-scheduling,therapy-query,therapy-slots,due-therapy-query,therapy-write,administration-record,therapy-create,therapy-candidate-page}.ts and relevant tests; backend/src/routes/{therapy,patient-therapies}.ts and focused route tests; backend/src/tools/capabilities/therapy.ts; backend/src/ai/assistant/{facility-signals,service}.ts; backend/src/skills/executors.ts plus relevant tests; backend/src/proactive/sources.ts only if boundary narrowing requires it; backend/src/intake/confirm-therapies.ts only if shared normalizer required. Frontend src/types.ts, App.tsx, lib/{therapyAdministrationWrite,therapySlotPage,patientTherapyCalendar,dashboardTherapies,dashboardTherapyRead,therapyGiro,therapyWeek,therapyDoseStatus}.ts; existing hooks/useRiepilogoSomministrazioni; components/operator/{TherapyRoundsPage,TherapyWeekCalendar,OperatorAgenda}.tsx, operator/cartella/{PatientTherapySlotDetail,PatientTherapyCalendar,PatientTherapyScheduleSummary,TherapyDrugDosePanel}.tsx, components/admin/AdminAgenda.tsx, components/shared/agnos/AgnosBrief.tsx and existing dashboard consumers; one focused reusable read-only verification panel and targeted tests. New followup harness/packet output only; existing e2e harness source may gain explicit output parameters if needed but MUST never write historical proof. Existing five writable band types stay unchanged. No Prisma schema/deps, no backend/src/skills/http.ts, no unrelated worktrees. Scope amendment is explicit before code; preserve UX447 semantics for later integration.

## Implementation Plan
Use the detailed read-only analysis in /workspace/.clinicos-cloud/pr483-codex-followup-20261018/analysis. Preserve originals; write a complete analysis/plan in this new followup before code. Implement coherent producer/consumer and security changes, focused regressions, simplify changed source and STOP for a NEW independent QA session. Root owns commits/publication/release. Author cannot self-certify. No remote GH/controller/provider/production operations.

## Test Plan
Run relevant credential-free focused tests and compile/build checks; full relevant suites once when source stable. Browser/runtime/DB only in an isolated owned stack under /tmp/clinicos-browser-qa.lock covering full lifecycle. Preserve unrelated services, refuse occupied ports/container identity mismatches. Redirect all nested harness output into fresh run directories. Actual results and SQL persistence/denial evidence required for clinical writes; voice remains local synthetic provider fixtures with capability limitations explicit. Any runtime resource uncertainty is checked before launch. Independent QA reruns relevant tests and inspects complete diff.

## Evidence Plan
Only synthetic records and fresh proof paths under this followup or new owned external QA root. Each public artifact <=25MiB, images/video decoded and all ZIP members CRC-checked and scanned for secrets/PHI. Hash all prior tracked proof before/after; no deletions, rewrites or reassignment of old evidence to new source. Source-bound evidence report and manifests, AC-to-test matrix and each issue-specific result required. Verdict READY FOR CODEX QA/BLOCKED/FAILED VALIDATION, never automatic closure/deploy.

## Gate Status
READY FOR IMPLEMENTATION
