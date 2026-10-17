# Implementation plan

1. Preserve existing normal groups, failed reviews, source SHAs and release holds; no live
   state transitions until tested controller code is published to trusted main.
2. Add exclusive PR+issue label projection and codex-review-ready only after report publication.
3. Add comment-channel request/claim/submit/reconcile helper and trusted CLI. Reserve before
   analysis, validate current PR/actor/source/nonce/round/schema/path, hash durable report,
   recover publication idempotently. Explicit initial recovery preserves failed round1.
4. Integrate report reconciliation into existing external step, preserve channel after code
   corrections, and require independent Codex QA after Claude approval. Existing controller
   remains sole implementation owner; release controller owns merge/deploy/closure.
5. Update local Claude autonomous prompt, project skill and read-only dashboard phase names.
6. Unit/integration/adversarial regressions, independent QA browser of actual protocol using
   synthetic HTTP GitHub transport; no real patients/database/model inference in QA.
7. Publish protected PR after QA, all6required native checks, merge exact reviewed head,
   request initial handoffs with prior failed reviews intact, verify actual labels/comments,
   then monitor user-started local Max reports. A request/fixture is not actual Claude success.
8. Inventory all other open PRs separately; no merging obsolete conflicting dispatcher or
   stale voice implementation without source reconciliation and its own meaningful tests.
