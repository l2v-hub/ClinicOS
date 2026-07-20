# Task Contract — Independent QA Gate on PR #293 (QA-263-016 remediation)

- **Engagement**: Independent QA gate session (did not write the code; review/test/evidence/verdict only; no production code changes, no merge, no issue close, no GitHub comments).
- **Subject**: PR #293 `fix/263-qa-016-doctor-fresh-checkout`, head SHA `14d50e3c171a323de74536589f5ae24f564d5168`, base `main`.
- **Parent issue**: #263 "Agent Team LLM-first con Claude development loop e Codex QA indipendente" (OPEN, labels: po-ready, ready-for-qa, assigned-to-claude, needs-evidence, feature, ready-for-dev).
- **Finding under remediation**: **QA-263-016** (severity high, AC2, category `doctor-fresh-checkout-false-negative`) from the Codex attempt-9 `qa_result` JSON (message_id `codex-qa-263-attempt-9-bf788751`, subject_sha `bf788751...`).

## QA-263-016 — observed vs expected (verbatim from Codex qa_result)

- **Observed**: at PR head bf788751, a clean detached worktree with `agent-team/.worktrees` not yet created returned `roots-ignored=false`, `developmentReady=false`, `qaReady=false`, exit 1. The committed `.gitignore` rule was valid (`git check-ignore` succeeds for `agent-team/.worktrees/probe`), but doctor checked the nonexistent directory path itself, making a fresh checkout inoperable until local state happened to create the directory.
- **Expected (acceptance for this gate)**:
  1. `agent-team:doctor` must **pass on a healthy fresh checkout** without requiring a prior worker run.
  2. Ignore validation must be **existence-independent** (e.g. probe a synthetic child path).
  3. It must remain **read-only** with respect to GitHub/workers (and disk — create nothing).
  4. There must be a **real temporary-git-repository regression test** covering absent runtime/worktree directories (no mocks on `git check-ignore`).

## Additional constraints

- **No regression** of any other issue-263 acceptance criterion (AC1, AC3–AC13 passed at attempt 9; this PR must not disturb them — enforced here via full agent-team unit+integration suite at head and strict diff scope).
- **Scope**: only `agent-team/src/commands/doctor.mjs`, `agent-team/tests/unit/doctor.test.mjs`, and evidence files under `artifacts/task-validation/qa-263-016-doctor-fresh-checkout-ignore-probe-fix/` may be touched. No frontend, backend, Prisma, API routes, or config changes.
- QA-263-017 (scope/UI-evidence governance on old PR #264) is **out of scope** for this gate; PR #264 is closed and this remediation is delivered standalone on PR #293.
- Verdict vocabulary for this engagement: **QA PASSED / BLOCKED / FAILED VALIDATION** (user removed Codex from the loop for this gate).

## Test plan (phases)

1. Diff review (scope + logic + false-positive analysis on prefix matching + test quality + hygiene).
2. Independent build & tests: `node --test agent-team/tests/unit/ agent-team/tests/integration/`; doctor unit file alone; `npm run agent-team:doctor` live run; frontend build N/A if scope confirms zero frontend/backend changes.
3. Objective evidence: QA-only HTML surface generated from real TAP output, verified via Playwright (real assertions, no console errors), screenshot + trace in this evidence folder. No app stack started.
4. Security checklist over the diff.
5. Verdict in `validation-report.md`.

Evidence root (final): `E:\Workspace\DG_SE_DEV\ClinicOS\artifacts\task-validation\263-qa-gate-pr293\`
