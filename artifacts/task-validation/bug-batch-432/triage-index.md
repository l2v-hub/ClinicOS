# Issue grouping

Group: bug-batch-432
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6

[
  {
    "issue": 432,
    "files": [
      "e2e/qa-functional-api.mjs",
      "e2e/qa-scheduled-retry-browser.mjs",
      "e2e/qa-therapy-completeness-browser.mjs",
      "frontend/src/App.tsx",
      "frontend/src/lib/__tests__/therapyNavigationGuard.test.ts",
      "frontend/src/lib/__tests__/therapyW2InPlace.test.ts",
      "frontend/src/lib/__tests__/therapyCompleteness.test.ts",
      "frontend/src/lib/__tests__/therapyPages.test.ts",
      "frontend/src/lib/therapyPages.ts",
      "e2e/qa-bug-batch-432.mjs",
      "e2e/therapy-import-api.mjs",
      "e2e/qa-bug-batch-432-browser.mjs"
    ]
  },
  {
    "issue": 441,
    "files": [
      "backend/src/routes/__tests__/therapy-authoritative-write.test.ts",
      "backend/src/routes/__tests__/therapy-slot-scope-contract.test.ts",
      "backend/src/routes/therapy.ts",
      "backend/src/skills/__tests__/administration-dose.test.ts",
      "backend/src/skills/executors.ts",
      "backend/src/therapies/administration-record.ts",
      "backend/src/therapies/due-therapy-query.ts",
      "backend/src/therapies/slot-scheduling.ts",
      "backend/src/therapies/therapy-administration-page.ts",
      "backend/src/therapies/therapy-query.ts",
      "backend/src/therapies/therapy-slots.ts",
      "backend/src/therapies/therapy-write.ts",
      "backend/src/tools/capabilities/therapy.ts",
      "e2e/qa-bug-batch-432.mjs",
      "e2e/qa-bug-batch-432-browser.mjs"
    ]
  },
  {
    "issue": 442,
    "files": [
      "backend/src/skills/__tests__/skills-e2e.test.ts",
      "e2e/qa-bug-batch-432.mjs",
      "e2e/qa-bug-batch-432-browser.mjs"
    ]
  },
  {
    "issue": 460,
    "files": [
      "backend/src/routes/__tests__/therapy-authoritative-write.test.ts",
      "backend/src/routes/therapy.ts",
      "backend/src/therapies/administration-record.ts",
      "backend/src/therapies/therapy-write.ts",
      "e2e/qa-scheduled-retry-browser.mjs",
      "frontend/src/App.tsx",
      "frontend/src/lib/__tests__/scheduledAdministrationRetries.test.ts",
      "frontend/src/lib/therapyAdministrationWrite.ts",
      "prisma/migrations/20261012224500_scheduled_administration_receipts/migration.sql",
      "prisma/schema.prisma",
      "e2e/qa-bug-batch-432.mjs",
      "e2e/qa-bug-batch-432-browser.mjs"
    ]
  },
  {
    "issue": 463,
    "files": [
      "e2e/qa-therapy-completeness-browser.mjs",
      "frontend/src/components/operator/cartella/farmacoRiferimento.ts",
      "frontend/src/components/operator/cartella/__tests__/farmacoRiferimento.test.ts",
      "e2e/qa-bug-batch-432.mjs",
      "e2e/qa-bug-batch-432-browser.mjs"
    ]
  },
  {
    "issue": 464,
    "files": [
      "backend/src/ai/__tests__/facility-signals.test.ts",
      "backend/src/ai/assistant/facility-signals.ts",
      "backend/src/ai/assistant/service.ts",
      "backend/src/lib/__tests__/facility-time.test.ts",
      "backend/src/lib/facility-time.ts",
      "backend/src/routes/__tests__/therapy-authoritative-write.test.ts",
      "backend/src/therapies/due-therapy-query.ts",
      "e2e/qa-bug-batch-432.mjs",
      "e2e/qa-bug-batch-432-browser.mjs"
    ]
  },
  {
    "issue": 467,
    "files": [
      "backend/src/routes/__tests__/therapy-authoritative-write.test.ts",
      "backend/src/therapies/administration-record.ts",
      "backend/src/therapies/due-therapy-query.ts",
      "backend/src/therapies/slot-scheduling.ts",
      "backend/src/therapies/therapy-administration-page.ts",
      "backend/src/therapies/therapy-query.ts",
      "backend/src/therapies/therapy-slots.ts",
      "backend/src/therapies/therapy-write.ts",
      "e2e/qa-therapy-completeness-browser.mjs",
      "e2e/qa-bug-batch-432.mjs",
      "e2e/qa-bug-batch-432-browser.mjs"
    ]
  }
]

Integration order: App.tsx also needs later UX447 presentation work, a separate UI cause from authoritative therapy write/idempotency/timezone. Integrate this therapy batch first; UX447 must rebase and serialize integration afterward, preserve recordAdministration/session guards and rerun therapy/navigation regressions. No parallel edits to same file or frozen batch scope expansion.

Acceptance, commands and distinct issue evidence are frozen in implementation-plan.md.
