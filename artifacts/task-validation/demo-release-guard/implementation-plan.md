# Frozen preparation plan

Difficulty high; direct senior execution, because deployment provenance, exact-SHA approval and closure are one coupled security boundary. This is preparatory infrastructure under root ownership, not a normal model-owned issue batch.

Scope:
- .github/workflows/deploy-backend.yml
- .github/workflows/codex-bug-release.yml
- agent-team/src/bug-pipeline/release.mjs
- agent-team/src/bug-pipeline/demo-deployment.mjs (new helper)
- agent-team/tests/bug-pipeline/release.test.mjs
- agent-team/tests/bug-pipeline/demo-deployment.test.mjs (new)
- backend/src/lib/readiness.ts
- backend/src/lib/__tests__/readiness-deployment.test.ts (new)
- artifacts/task-validation/demo-release-guard/ (contract, protocol research, actual verification evidence)

Steps:
1. Inspect official Railway CLI v5.66 source/API query shapes and record safe source links; reject missing metadata rather than infer provenance.
2. Implement fixed target preflight and post-upload deployment/active-ready receipt helper with strict validation, bounded no-redirect HTTPS, and trusted Actions artifact verification for release.
3. Preserve production job and add demo job with dedicated environment/token, explicit target, pinned CLI, exact source, evidence artifact.
4. Extend release hold and mandatory demo receipt paths; preserve reviewed SHA/evidence/attempt ledgers. Separate configured credentials premerge from actual deployment proof postmerge.
5. Add optional deployment UUID readiness field without changing absent-env contract.
6. Run meaningful focused and existing tests; report actual limits and hand off stable source to independent QA. No publication or release.

Gates: no app changes before this contract; no root clinical worktree changes; no credentials; no production fixtures; no lifecycle closure before real target receipt; no bootstrap bypass. Dedicated independent QA and final real Claude review remain pending.

Protocol decision recorded during implementation: official CLI upload omits Git metadata, so step2 uses the supported `serviceInstanceDeployV2(commitSha)` source-deploy API instead of upload. Source branch is verified through official deploymentTriggers because ServiceSource has no branch field. Parent approved this exact protocol choice. Production CLI remains pinned and independent. Dedicated-environment credentials cannot be inspected by the production job: actual current-main preflight artifact, rather than a fabricated cross-environment presence boolean, is the premerge capability gate. Final live verification runs in the dedicated demo environment.
