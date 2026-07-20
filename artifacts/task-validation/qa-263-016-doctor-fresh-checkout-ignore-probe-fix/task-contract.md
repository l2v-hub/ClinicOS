# Task Contract

## Task

- Title: QA-263-016 doctor fresh-checkout ignore probe fix
- Slug: qa-263-016-doctor-fresh-checkout-ignore-probe-fix
- Type: change
- Date: 2026-07-20
- Issue: #263 (Codex QA finding QA-263-016, severity high, AC2)

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

Impacted area: internal tooling only — `agent-team/` orchestration subsystem (CLI `npm run agent-team:doctor`), no application code.

## Current Behaviour

`runDoctor` validates that `config.runtimeRoot` and `config.worktreeRoot` are git-ignored by running
`git check-ignore <runtimeRoot> <worktreeRoot>` on the bare directory paths. On a fresh checkout where
`agent-team/.worktrees` has not yet been created on disk, `git check-ignore` returns nothing for the
bare path, so doctor reports `roots-ignored: not git-ignored`, `developmentReady=false`,
`qaReady=false` and exits 1 — a false negative on an otherwise healthy clone (Codex finding
QA-263-016 at PR #264 head bf788751).

## Expected Behaviour

The `roots-ignored` check must be existence-independent: doctor probes a synthetic child path under
each root (`<root>/.doctor-ignore-probe`), which the parent ignore rule always covers regardless of
whether the directory exists on disk. The check stays read-only (no GitHub/worker side effects, no
directory creation). Doctor passes on a healthy fresh checkout without requiring a prior worker run,
and still fails closed when the `.gitignore` rules are missing.

## Acceptance Criteria

- AC1: `git check-ignore` is invoked on synthetic child paths under each root, never on the bare directories; the check creates nothing on disk.
- AC2: In a real temporary git repository with the repo's ignore rules and the root directories absent (fresh-checkout simulation), the `roots-ignored` check passes.
- AC3: In a real temporary git repository without the ignore rules, the `roots-ignored` check fails closed and names the missing roots.
- AC4: Existing doctor behaviours are preserved (C-quoted Windows path handling, fail-closed on partial ignore coverage); the full agent-team unit + integration suite passes.

## Test Plan

| Test type                 | Required | Reason                                                                                                                                                                                                            |
| ------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | `agent-team/tests/unit/doctor.test.mjs` — mocked-run tests updated to the probe-child command + new real temp-git-repo regression tests (AC2/AC3, per QA-263-016 "real temporary-git-repository regression test") |
| Integration               |      yes | full `agent-team/tests/integration` suite must stay green (AC4)                                                                                                                                                   |
| API                       |       no | no backend change                                                                                                                                                                                                 |
| Playwright                |       no | CLI-only subsystem, no UI surface touched; objective evidence = deterministic test output attached to the issue                                                                                                   |
| Persistence after refresh |       no | no data change                                                                                                                                                                                                    |
| Agnos action registry     |       no | not touched                                                                                                                                                                                                       |
| Voice simulation          |       no | not touched                                                                                                                                                                                                       |
| OCR/import test           |       no | not touched                                                                                                                                                                                                       |
| Security/privacy scan     |       no | read-only git probe, no secrets/PHI                                                                                                                                                                               |

## Evidence Plan

Required evidence:

- validation-report.md with real executed commands and full test output (logs/)
- unit + integration suite output at the pushed commit SHA
- evidence comment on issue #263 linking the committed files at the SHA

## Risks

- Git version differences in `check-ignore` echo format (C-quoting on Windows) — mitigated: existing normalize/unquote logic retained and covered by the updated Windows-quoting test; new regression test runs real `git` so any environment divergence surfaces in CI/QA rather than staying mocked.
- Mock drift: test doubles must mirror the new command shape — mitigated by the real-git regression tests that bypass mocks entirely.

## Gate Status

READY FOR IMPLEMENTATION
