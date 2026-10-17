# Frozen implementation plan

Branch: codex/bug-batch-432
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6

{
  "title": "Complete therapy inventory and authoritative single-write delivery",
  "feature": "patient therapy inventory, import reconciliation, scheduling, administration and assistant",
  "rationale": "Seven issue reports share therapy prescription identity, persisted administrations, patient scope and calendar/feed paths. Reuse PR466 in one current-main worktree so dose/retry/timezone fixes cannot overwrite each other.432 additionally audits the already merged import work end-to-end.",
  "analysis": "Baseline a516d42e31f6674c39c1d130c9706cd80a7ab4c6; reuse original PR466 head7028844633760f03a42072fa6648f975370e6db6, keeping old artifacts historical. Current read-only triage verified all30 source hashes and27 stored evidence hashes but this is not fresh execution. Complete432 negative pagination, print/switch and full import require fresh explicit coverage. Receipt migration must precede backend and frontend deployment. No production data, external provider inference, automation controls or authentication bypass.",
  "execution": {
    "difficulty": "high",
    "mode": "direct",
    "reason": "Clinical write idempotency, patient authorization, one-off identity, facility time and paginated import completeness interact across shared files; one senior implementer integrates and verifies with independently assigned QA after handoff."
  },
  "issues": [
    432,
    441,
    442,
    460,
    463,
    464,
    467
  ],
  "scope": [
    "backend/src/ai/__tests__/facility-signals.test.ts",
    "backend/src/ai/assistant/facility-signals.ts",
    "backend/src/ai/assistant/service.ts",
    "backend/src/lib/__tests__/facility-time.test.ts",
    "backend/src/lib/facility-time.ts",
    "backend/src/routes/__tests__/therapy-authoritative-write.test.ts",
    "backend/src/routes/__tests__/therapy-slot-scope-contract.test.ts",
    "backend/src/routes/therapy.ts",
    "backend/src/skills/__tests__/administration-dose.test.ts",
    "backend/src/skills/__tests__/skills-e2e.test.ts",
    "backend/src/skills/executors.ts",
    "backend/src/therapies/administration-record.ts",
    "backend/src/therapies/due-therapy-query.ts",
    "backend/src/therapies/slot-scheduling.ts",
    "backend/src/therapies/therapy-administration-page.ts",
    "backend/src/therapies/therapy-query.ts",
    "backend/src/therapies/therapy-slots.ts",
    "backend/src/therapies/therapy-write.ts",
    "backend/src/tools/capabilities/therapy.ts",
    "e2e/qa-functional-api.mjs",
    "e2e/qa-scheduled-retry-browser.mjs",
    "e2e/qa-therapy-completeness-browser.mjs",
    "frontend/src/App.tsx",
    "frontend/src/components/operator/cartella/farmacoRiferimento.ts",
    "frontend/src/lib/__tests__/scheduledAdministrationRetries.test.ts",
    "frontend/src/lib/__tests__/therapyNavigationGuard.test.ts",
    "frontend/src/lib/__tests__/therapyW2InPlace.test.ts",
    "frontend/src/lib/therapyAdministrationWrite.ts",
    "prisma/migrations/20261012224500_scheduled_administration_receipts/migration.sql",
    "prisma/schema.prisma",
    "frontend/src/components/operator/cartella/__tests__/farmacoRiferimento.test.ts",
    "frontend/src/lib/__tests__/therapyCompleteness.test.ts",
    "frontend/src/lib/__tests__/therapyPages.test.ts",
    "frontend/src/lib/therapyPages.ts",
    "e2e/qa-bug-batch-432.mjs",
    "e2e/therapy-import-api.mjs",
    "e2e/qa-bug-batch-432-browser.mjs"
  ],
  "fileMap": [
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
  ],
  "separationReason": "App.tsx also needs later UX447 presentation work, a separate UI cause from authoritative therapy write/idempotency/timezone. Integrate this therapy batch first; UX447 must rebase and serialize integration afterward, preserve recordAdministration/session guards and rerun therapy/navigation regressions. No parallel edits to same file or frozen batch scope expansion.",
  "acceptance": [
    {
      "issue": 432,
      "criteria": [
        "Complete saved prescription inventory follows all pages including inactive prescriptions independently from calendar filtering; 106-prescription real DB fixture proves both pages and exact counts.",
        "PRN visible in day/week, including period bounds; no administration outside prescription period; absent feed rows remain read-only without invented dose identity, quantity, or authorization.",
        "Short, inconsistent, repeating, other-patient paginated data fails closed; error/retry, patient switching, aborted stale responses and print completeness are covered by value assertions.",
        "Real HTTP/DB import reconciliation preserves every retained source occurrence through review, confirmation and saved list; ambiguous/structured-only entries require review, exclusions explicit, stale omissions rejected, replay creates one patient and exactly intended therapies.",
        "Responsive browser, persistence after reload, independent QA, immutable evidence at final tested SHA and verified deployment required before issue closure."
      ]
    },
    {
      "issue": 441,
      "criteria": [
        "Explicit one-off date/time with no legacy band flags appears in feed, summary and assistant; server resolves authoritative dose and actor.",
        "Wrong clock, date or band and contradictory schedule are rejected; successful write creates exactly one correct medication administration and repeat write is rejected."
      ]
    },
    {
      "issue": 442,
      "criteria": [
        "Held correction/interpreter barrier deterministically reproduces stale correction; confirmation releases only correct result, completion remains recorded, replay causes no duplicate clinical write.",
        "Run regression under actual full backend suite load; retain original safety assertions and guarantee barrier cleanup even on test failure."
      ]
    },
    {
      "issue": 460,
      "criteria": [
        "Same actor/requestId and same immutable request replays first outcome including lost-response/reload retry, with exactly one administration and one receipt.",
        "Changed payload/requestId conflict and changed current patient authorization are rejected before receipt disclosure; pending-only request cannot overwrite refusal; concurrent requests preserve first snapshot.",
        "Browser visible retry retains request identity across reload and session changes do not leak or reuse another actor retry; relevant clients exercise same contract."
      ]
    },
    {
      "issue": 463,
      "criteria": [
        "Strict empty catalog status suppresses automatic per-drug searches across complete inventory and renders unavailable distinct from drug not found.",
        "Available catalog continues resolving found/absent drugs; unreachable/malformed/unknown status does not falsely claim empty catalog or bypass established lookup behavior; public limit unchanged."
      ]
    },
    {
      "issue": 464,
      "criteria": [
        "Europe/Rome day and minute independent of host timezone; future08:00 not overdue at00:30, due00:45 then overdue00:46, exact expected counts and dose identity.",
        "Midnight/year boundary/winter/summer/both DST transitions tested; assistant/feed/due query share facility clock; existing access controls and bounds retained."
      ]
    },
    {
      "issue": 467,
      "criteria": [
        "Already administered or refused one-off stays recorded after editing time across bands; no second administration, no mutation of first record; feed/summary/assistant agree.",
        "Periodic multidose prescriptions keep distinct scheduled doses independent, including same-band08:00/10:00 and exact quantity; browser reload preserves status."
      ]
    }
  ],
  "tasks": [
    {
      "title": "Reuse existing PR466 production and regression changes on current main",
      "files": [
        "backend/src/ai/__tests__/facility-signals.test.ts",
        "backend/src/ai/assistant/facility-signals.ts",
        "backend/src/ai/assistant/service.ts",
        "backend/src/lib/__tests__/facility-time.test.ts",
        "backend/src/lib/facility-time.ts",
        "backend/src/routes/__tests__/therapy-authoritative-write.test.ts",
        "backend/src/routes/__tests__/therapy-slot-scope-contract.test.ts",
        "backend/src/routes/therapy.ts",
        "backend/src/skills/__tests__/administration-dose.test.ts",
        "backend/src/skills/__tests__/skills-e2e.test.ts",
        "backend/src/skills/executors.ts",
        "backend/src/therapies/administration-record.ts",
        "backend/src/therapies/due-therapy-query.ts",
        "backend/src/therapies/slot-scheduling.ts",
        "backend/src/therapies/therapy-administration-page.ts",
        "backend/src/therapies/therapy-query.ts",
        "backend/src/therapies/therapy-slots.ts",
        "backend/src/therapies/therapy-write.ts",
        "backend/src/tools/capabilities/therapy.ts",
        "e2e/qa-functional-api.mjs",
        "e2e/qa-scheduled-retry-browser.mjs",
        "e2e/qa-therapy-completeness-browser.mjs",
        "frontend/src/App.tsx",
        "frontend/src/components/operator/cartella/farmacoRiferimento.ts",
        "frontend/src/lib/__tests__/scheduledAdministrationRetries.test.ts",
        "frontend/src/lib/__tests__/therapyNavigationGuard.test.ts",
        "frontend/src/lib/__tests__/therapyW2InPlace.test.ts",
        "frontend/src/lib/therapyAdministrationWrite.ts",
        "prisma/migrations/20261012224500_scheduled_administration_receipts/migration.sql",
        "prisma/schema.prisma"
      ],
      "steps": [
        "Review original source diff and selectively apply original application/tests, avoiding unrelated historical evidence and controller files.",
        "Resolve current-main integration without dropping current behavior or weakening existing tests.",
        "Generate isolated Prisma client with receipt schema and record migration ordering; never migrate production."
      ]
    },
    {
      "title": "Close inventory, catalog and authorization acceptance gaps",
      "files": [
        "frontend/src/components/operator/cartella/__tests__/farmacoRiferimento.test.ts",
        "frontend/src/lib/__tests__/therapyCompleteness.test.ts",
        "frontend/src/lib/__tests__/therapyPages.test.ts",
        "frontend/src/lib/therapyPages.ts",
        "e2e/qa-bug-batch-432.mjs",
        "e2e/therapy-import-api.mjs",
        "e2e/qa-bug-batch-432-browser.mjs",
        "frontend/src/components/operator/cartella/farmacoRiferimento.ts",
        "backend/src/routes/__tests__/therapy-authoritative-write.test.ts",
        "e2e/qa-therapy-completeness-browser.mjs",
        "e2e/qa-scheduled-retry-browser.mjs"
      ],
      "steps": [
        "Add meaningful unit regressions for full pagination, cross-patient mismatches, inconsistent counts, stale results and retry/print behavior; change application helpers only when behavior fails.",
        "Exercise strict catalog-empty versus available/unreachable/malformed behavior without bypassing public limits.",
        "Strengthen live receipt replay/current ownership denial and one-off band shift assertions; preserve immutable first result and actor.",
        "Rerun import5-occurrence/3persisted/2explicit deferred API audit with omission rejection and real DB reload/replay."
      ]
    },
    {
      "title": "One reproducible isolated stack invocation and per-issue browser evidence",
      "files": [
        "e2e/qa-bug-batch-432.mjs",
        "e2e/qa-bug-batch-432-browser.mjs",
        "e2e/qa-therapy-completeness-browser.mjs",
        "e2e/qa-scheduled-retry-browser.mjs",
        "e2e/qa-functional-api.mjs",
        "e2e/therapy-import-api.mjs"
      ],
      "steps": [
        "Harness refuses non-loopback URLs and non-QA DB; creates owned nonprivileged Docker postgres:16 container clinicos-qa-batch432 with publish127.0.0.1:55432 only, no hostroot mount/privileged flags; records trusted image digest and SQL readiness, migrates/seeds synthetic clinicos_qa_batch432 database and uses separate frontend/backend ports. Native PostgreSQL16 is allowed only when already supplied by CI.",
        "Start backend real HTTP and Vite frontend with mock local-only providers, wait health, execute targeted+applicable backend/frontend tests and import HTTP regression.",
        "Serialize browser with flock /tmp/clinicos-browser-qa.lock; real value/record assertions, expected negative statuses classified, fail on unexpected relevant4xx/5xx, console errors and page errors.",
        "Capture each issue screenshot, trace and video with assertions plus responsive inventory/import UI; backend-only442/464 use safe local synthetic QA-only results surface.",
        "Use try/finally to stop only owned child processes and owned container/database; verify ownership identity before cleanup and never remove preexisting unrelated container. Never claim prior reports as current results."
      ]
    },
    {
      "title": "Simplify, rerun and hand off to independent QA",
      "files": [
        "backend/src/ai/__tests__/facility-signals.test.ts",
        "backend/src/ai/assistant/facility-signals.ts",
        "backend/src/ai/assistant/service.ts",
        "backend/src/lib/__tests__/facility-time.test.ts",
        "backend/src/lib/facility-time.ts",
        "backend/src/routes/__tests__/therapy-authoritative-write.test.ts",
        "backend/src/routes/__tests__/therapy-slot-scope-contract.test.ts",
        "backend/src/routes/therapy.ts",
        "backend/src/skills/__tests__/administration-dose.test.ts",
        "backend/src/skills/__tests__/skills-e2e.test.ts",
        "backend/src/skills/executors.ts",
        "backend/src/therapies/administration-record.ts",
        "backend/src/therapies/due-therapy-query.ts",
        "backend/src/therapies/slot-scheduling.ts",
        "backend/src/therapies/therapy-administration-page.ts",
        "backend/src/therapies/therapy-query.ts",
        "backend/src/therapies/therapy-slots.ts",
        "backend/src/therapies/therapy-write.ts",
        "backend/src/tools/capabilities/therapy.ts",
        "e2e/qa-functional-api.mjs",
        "e2e/qa-scheduled-retry-browser.mjs",
        "e2e/qa-therapy-completeness-browser.mjs",
        "frontend/src/App.tsx",
        "frontend/src/components/operator/cartella/farmacoRiferimento.ts",
        "frontend/src/lib/__tests__/scheduledAdministrationRetries.test.ts",
        "frontend/src/lib/__tests__/therapyNavigationGuard.test.ts",
        "frontend/src/lib/__tests__/therapyW2InPlace.test.ts",
        "frontend/src/lib/therapyAdministrationWrite.ts",
        "prisma/migrations/20261012224500_scheduled_administration_receipts/migration.sql",
        "prisma/schema.prisma",
        "frontend/src/components/operator/cartella/__tests__/farmacoRiferimento.test.ts",
        "frontend/src/lib/__tests__/therapyCompleteness.test.ts",
        "frontend/src/lib/__tests__/therapyPages.test.ts",
        "frontend/src/lib/therapyPages.ts",
        "e2e/qa-bug-batch-432.mjs",
        "e2e/therapy-import-api.mjs",
        "e2e/qa-bug-batch-432-browser.mjs"
      ],
      "steps": [
        "Remove unnecessary complexity/debug code while preserving clinical invariants and test assertions.",
        "Run exact frozen verification commands with sanitized logs, record changed files and SHA/hash manifest and prepare unverified validation report.",
        "Stop before publication and ask root to assign independent QA; root handles exact-SHA external Claude review, required checks, migration/backend/frontend verified release and issue completion."
      ]
    }
  ],
  "verification": [
    {
      "command": "npm",
      "args": [
        "--prefix",
        "frontend",
        "run",
        "build"
      ]
    },
    {
      "command": "npm",
      "args": [
        "--prefix",
        "backend",
        "run",
        "build"
      ]
    },
    {
      "command": "node",
      "args": [
        "--import",
        "tsx",
        "--test",
        "frontend/src/lib/__tests__/therapyPages.test.ts",
        "frontend/src/lib/__tests__/therapyCompleteness.test.ts",
        "frontend/src/lib/__tests__/scheduledAdministrationRetries.test.ts",
        "frontend/src/components/operator/cartella/__tests__/farmacoRiferimento.test.ts",
        "backend/src/lib/__tests__/facility-time.test.ts"
      ]
    },
    {
      "command": "node",
      "args": [
        "e2e/qa-bug-batch-432.mjs",
        "--test"
      ]
    }
  ],
  "evidence": [
    {
      "issue": 432,
      "screenshot": "artifacts/task-validation/bug-batch-432/evidence/issue-432.png",
      "trace": "artifacts/task-validation/bug-batch-432/evidence/issue-432-trace.zip",
      "video": "artifacts/task-validation/bug-batch-432/evidence/issue-432.webm"
    },
    {
      "issue": 441,
      "screenshot": "artifacts/task-validation/bug-batch-432/evidence/issue-441.png",
      "trace": "artifacts/task-validation/bug-batch-432/evidence/issue-441-trace.zip",
      "video": "artifacts/task-validation/bug-batch-432/evidence/issue-441.webm"
    },
    {
      "issue": 442,
      "screenshot": "artifacts/task-validation/bug-batch-432/evidence/issue-442.png",
      "trace": "artifacts/task-validation/bug-batch-432/evidence/issue-442-trace.zip",
      "video": "artifacts/task-validation/bug-batch-432/evidence/issue-442.webm"
    },
    {
      "issue": 460,
      "screenshot": "artifacts/task-validation/bug-batch-432/evidence/issue-460.png",
      "trace": "artifacts/task-validation/bug-batch-432/evidence/issue-460-trace.zip",
      "video": "artifacts/task-validation/bug-batch-432/evidence/issue-460.webm"
    },
    {
      "issue": 463,
      "screenshot": "artifacts/task-validation/bug-batch-432/evidence/issue-463.png",
      "trace": "artifacts/task-validation/bug-batch-432/evidence/issue-463-trace.zip",
      "video": "artifacts/task-validation/bug-batch-432/evidence/issue-463.webm"
    },
    {
      "issue": 464,
      "screenshot": "artifacts/task-validation/bug-batch-432/evidence/issue-464.png",
      "trace": "artifacts/task-validation/bug-batch-432/evidence/issue-464-trace.zip",
      "video": "artifacts/task-validation/bug-batch-432/evidence/issue-464.webm"
    },
    {
      "issue": 467,
      "screenshot": "artifacts/task-validation/bug-batch-432/evidence/issue-467.png",
      "trace": "artifacts/task-validation/bug-batch-432/evidence/issue-467-trace.zip",
      "video": "artifacts/task-validation/bug-batch-432/evidence/issue-467.webm"
    }
  ]
}
