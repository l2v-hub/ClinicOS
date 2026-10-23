# Task Contract

## Task
Integrate exact483 recorded outcomes fix in UX candidate before independent all-eight QA.

## Scope
- backend/src/routes/__tests__/therapy-authoritative-write.test.ts
- backend/src/therapies/__tests__/slot-scheduling.test.ts
- backend/src/therapies/due-therapy-query.ts
- backend/src/therapies/slot-scheduling.ts
- backend/src/therapies/therapy-administration-page.ts
- backend/src/therapies/therapy-query.ts
- backend/src/therapies/therapy-slots.ts
- frontend/src/components/operator/cartella/PatientTherapyCalendar.tsx
- frontend/src/components/shared/TherapyVerificationPanel.tsx
- frontend/src/components/shared/__tests__/agendaTherapyVerification.test.ts
- frontend/src/lib/__tests__/therapyVerification.test.ts
- frontend/src/lib/dashboardTherapies.ts
- frontend/src/lib/therapySlotPage.ts
- frontend/src/types.ts

## Acceptance Criteria
- Preserve actual recorded outcomes as read-only facts, no synthetic schedules or new writes.
- Preserve UX facility date, temporary PS exit and explicit route guards.
- Fresh independent browser/HTTP/PostgreSQL all-eight plus all-seven parent regressions, actual Claude, final Codex and protected release remain required.

## Validation
Exact-parent normal merge; types and focused author checks are preliminary only.

## Gate Status
SOURCE CHECKPOINT ONLY; independent QA pending.
