# Independent QA — attempt 1

**FAILED VALIDATION**. Independent reviewer `/root/handoff_independent_qa`; base `origin/main` 299ba8. No source changes, commits, pushes, live GitHub mutations, model calls, Docker or database access by QA. Source bytes are bound in source-hashes.json.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | task-contract.md and root task-contract/analysis/implementation-plan, current user instruction |
| 1 Full diff | FAIL: two correctness defects | findings below; tracked-diff.patch plus source-hashes.json includes untracked source |
| 2 Independent tests/build | PASS | regression.log: 631 tests, 628 PASS, 3 existing Windows-only SKIP; types.log zero errors; build.log successful production build, loopback VITE_API_URL, pre-existing chunk-size warning |
| 3 Actual browser | NOT RUN | Gate stopped after independently reproduced correctness failures, per root instruction; no screenshot or E2E pass claimed |
| 4 Security | PASS for inspected scope, no release readiness | authorization rechecks/CAS/source SHA/nonces/report validation/tracked paths/bounded files checked; no new dependencies/routes/secrets/clinical payloads; no auth/CI/protection bypass. Cross-resource operations remain non-atomic, correctly documented |

## F1 — legitimate controller publication is mistaken for new human feedback

`agent-team/src/bug-pipeline/comment-review-handoff.mjs`: handoffFeedbackFingerprint excludes the publication marker only when author equals the review owner. Request by authorized maintainer, claim/report by another authorized review-bot, then import/publication by maintainer sets `feedbackChanged: true` solely because the controller published its own legitimate server review. The external controller treats that as a correction requirement, consuming implementation/review budget although there is no finding. This matters when automatic controller and local submit race to import the same report.

Reproduction: `node artifacts/task-validation/review-label-handoff/independent-qa/qa-fixture.mjs --probe`; expected false, actual true. This isolated fixture is copied from author setup with imports targeting real production modules and a generalized collaborator permission response to support two authorized identities. See adversarial-distinct-actor.log. Require authenticated, exact current publication exclusion, preserving arbitrary other-author comments as feedback.

## F2 — actual Codex QA dirties its own packet and deadlocks correction

`agent-team/src/bug-pipeline/external-review.mjs`: new post-Claude block calls actual `workspace.qa(batch)` then routes a changes-requested result through the existing `workspace.prepare(batch)` correction branch. Actual `agent-team/src/bug-pipeline/workspace.mjs:240` writes tracked `codex-independent-qa.md`; prepare explicitly rejects a dirty worktree. Thus the workflow cannot act on its own Codex findings. Existing unit mocks return a status without this real filesystem side effect.

Reproduction: `node artifacts/task-validation/review-label-handoff/independent-qa/adversarial-real-workspace.mjs`; uses actual createWorkspace, actual temporary Git repository and registered worktree, synthetic QA result, fetch stub only. Actual dirty path is the one QA report, and prepare throws `occupied worktree is not the clean expected batch`. Temp repository cleaned in finally. See adversarial-real-workspace.log. Preserve immutable reviewed source and evidence; store post-review QA outside reviewed worktree or provide narrowly owned atomic report handling without accepting unrelated dirty files.

## Limits and disposition

Do not open/merge this candidate or request live reviews. Root accepted both defects and resumes implementation cycle 2. This packet is historical failed evidence, not reusable final readiness. Re-run affected tests plus fresh independent QA including actual safe browser screenshot/trace/video after source STOP. Real Claude Max and deployment remain unexecuted by this QA.
