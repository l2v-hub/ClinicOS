# Implementation plan — GitHub issue review communication

Baseline8124b1bc88c0f086b1ee328214f87f4802005d11. Worktree agent-team/.worktrees/issue-review-communication, branch codex/issue-review-communication. Attempt1/4, reviews0/4, separate newly requested communication feature; no clinical batch ownership or budget changes.

1. Implement one narrowly scoped communication module: fixed managed labels, durable state projection, bounded authorized issue feedback, safe markers, source-comment acknowledgement, actual PR mirror compatibility, full fresh cohort/head checks before writes and no untrusted approval extraction.
2. Integrate existing external-review and cron at their established boundaries without changing PR fingerprint shape, source-state ownership or model/release policy. On new verified commits, the existing handoff restores readiness.
3. Add a trusted-main sibling workflow/CLI every five minutes, after controller completion and by manual dispatch. Require existing CLINICOS_BOT_TOKEN for events; no token fallback that falsely claims notification. It writes only idempotent issue/PR comments and informational labels, never state, budgets, inference, merges or closure. No issue_comment self-trigger.
4. Meaningful new failure/identity/drift/author/redaction/race/old-worker/idempotency tests plus existing regression suite; simplify and rerun affected checks. Seal exact source and history. Author stops without provider/GH actions, commits, pushes or PR.
5. A NEW independent QA session runs all five mandatory phases incl actual browser surface screenshot/trace/video. Root reviews proof, publishes operational PR with Refs only, waits every required CI and activates trusted-main sibling. Actual native sync must verify labels/comments and event notification, without invoking another model or mislabeling failed reviews as approved.

Frozen source scope:
- agent-team/src/bug-pipeline/external-review.mjs
- agent-team/src/bug-pipeline/claude-review-cron.mjs
- agent-team/src/bug-pipeline/issue-review-communication.mjs
- agent-team/src/bug-pipeline/issue-review-sync.mjs
- agent-team/tests/bug-pipeline/external-review.test.mjs
- agent-team/tests/bug-pipeline/issue-review-communication.test.mjs
- .github/workflows/codex-issue-review-sync.yml

No G19 source edits. No developer API key request, user log relay, production data or extra inference. Existing failed Max reviews remain spent/blocked.
