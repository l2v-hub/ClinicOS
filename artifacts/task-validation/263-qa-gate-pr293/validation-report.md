# Validation Report — Independent QA Gate on PR #293 (QA-263-016 remediation)

- **Subject**: PR #293 `fix/263-qa-016-doctor-fresh-checkout` → `main`, head `14d50e3c171a323de74536589f5ae24f564d5168` (merge-base `e3e0971`).
- **Finding**: QA-263-016 (high, AC2) — `agent-team:doctor` false-negative on fresh checkout (roots-ignored probed the bare, not-yet-existing directory paths).
- **Auditor**: independent QA session (did not author the code). No production code modified; no merge, no issue close, no GitHub comments.
- **Environment**: Windows 11, node v20.19.6, isolated git worktree at `.claude/worktrees/agent-a3bf3eb1f0b21e88a` checked out at head SHA. Notably, `agent-team/.worktrees` did **not exist** in this worktree — the exact Codex `qa.command.doctor.clean-worktree` repro condition.

## Phase table

| Phase | Result | Summary |
|---|---|---|
| 0 — Contract | PASS | QA-263-016 expected behaviour extracted from Codex attempt-9 `qa_result` (message `codex-qa-263-attempt-9-bf788751`) into `task-contract.md`. |
| 1 — Diff review | PASS (1 advisory) | Scope exact; logic existence-independent and fail-closed; read-only; real temp-git-repo tests; no debug leftovers. Advisory F1 below. |
| 2 — Build & tests | PASS | Full suite 108/108 pass (exit 0); doctor unit 19/19 incl. both QA-263-016 tests; live `npm run agent-team:doctor` → `ok:true`, 21/21 checks green, `roots-ignored: ok` with `.worktrees` absent. Frontend build **N/A justified**: diff contains zero frontend/backend/Prisma/config files (verified by `git diff --name-status e3e0971 14d50e3`). |
| 3 — Objective evidence | PASS | QA-only surface `qa-report.html` generated from real TAP re-run + live doctor JSON; Playwright verified it (real `expect()` on both regression tests = pass, totals 19/19/0, roots-ignored pass, head SHA shown, zero console/page errors) → screenshot + trace.zip + results.json. App stack NOT started. |
| 4 — Security | PASS | Checklist below, all rows PASS. |
| 5 — Verdict | **QA PASSED** | All QA-263-016 acceptance points satisfied; no regression signal. |

## Phase 0 — Contract

Sources: `gh issue view 263 --comments` (captured in `logs/issue-263-comments-tail.log`), `gh pr view 293`. Acceptance criteria (from Codex `expected`): (1) doctor passes on healthy fresh checkout without prior worker run; (2) ignore validation existence-independent via synthetic child probe; (3) read-only w.r.t. GitHub/workers/disk; (4) real temporary-git-repository regression test for absent runtime/worktree dirs; plus (5) no regression of other #263 ACs and strict scope. See `task-contract.md`.

## Phase 1 — Diff review

Command: `git diff --name-status e3e0971 14d50e3` → exactly 7 files: `agent-team/src/commands/doctor.mjs` (M), `agent-team/tests/unit/doctor.test.mjs` (M), 5 added files under `artifacts/task-validation/qa-263-016-doctor-fresh-checkout-ignore-probe-fix/`. **No** frontend, backend, Prisma, API route, config, or package.json changes. Full patch: `logs/pr293-code-diff.patch`.

Logic (`agent-team/src/commands/doctor.mjs:212-242`):
- The check now runs `git check-ignore <runtimeRoot>/.doctor-ignore-probe <worktreeRoot>/.doctor-ignore-probe` (doctor.mjs:221-225). A child path is matched by the parent `.gitignore` rule regardless of whether the directory exists → existence-independent. Empirical demo in `logs/root-cause-empirical-demo.log` (`.gitignore:46-47` rules; child probe matched with `.worktrees` absent). Note: on this workstation's git version the bare-dir probe also happens to match, but the Codex environment demonstrated it does not — the child probe is the variant that is correct across git behaviours, and the temp-repo regression tests pin it.
- **Fail-closed preserved**: `check-ignore` echoes only ignored argv paths; when rules are missing stdout is empty (exit 1) → both roots reported `not git-ignored` (doctor.mjs:235-239). A git hard failure (exit 128, empty stdout) also fails closed. The validator never trusts exit code alone.
- **Read-only**: `git check-ignore` touches nothing; the probe path is synthetic and never created (verified by test assertion `assert.rejects(access(.../agent-team))`, doctor.test.mjs:361). No GitHub/worker calls added.
- **False-positive analysis** (doctor.mjs:234-237, `line.startsWith(normalize(root))`):
  - *Unrelated listed line making a missing root pass*: not possible — `git check-ignore` output is restricted to the two argv probe paths, so `listed` ⊆ {runtimeProbe, worktreeProbe}; there are no unrelated lines.
  - *Root prefix collision (e.g. `.runtime` vs `.runtime-other`)*: theoretical only. `startsWith` is string-prefix, not path-segment-prefix, so if one configured root were a string prefix of the other, the longer root's listed probe could satisfy the shorter root. With the shipped config (`agent-team/.runtime` vs `agent-team/.worktrees`, `agent-team/config/default.json:12,14`) neither is a prefix of the other → unreachable in practice. Recorded as advisory **F1**.

**F1 (advisory, non-blocking)** — doctor.mjs:236: matching could be exact instead of prefix-based: the code knows the exact probe path, so `listed.includes(normalize(`${root}/.doctor-ignore-probe`))` (or a path-segment-boundary check) would eliminate the theoretical prefix collision entirely. Not required for this gate since it is unreachable with the fixed config and cannot be triggered by external input.

Test quality (`agent-team/tests/unit/doctor.test.mjs:296-379`):
- `makeFreshCheckout` builds a **real** temp git repo (`mkdtemp` + `git init` + optional `.gitignore`, doctor.test.mjs:299-305); `realCheckIgnoreRun` executes the **real** `git check-ignore` inside it via `execFile` with `cwd: repo` — no mocks on check-ignore (doctor.test.mjs:309-325). `realpath` guards against symlinked tmpdir; cleanup in `finally` via `rm(recursive)`.
- Test 18 (fresh checkout, rules present, roots absent) asserts `roots-ignored.ok === true` **and** that nothing was created on disk. Test 19 (no rules) asserts `ok === false` with detail naming both `.runtime` and `.worktrees`. Pre-existing mock tests updated consistently to the new command shape (incl. the Windows C-quoted-path test).
- Hygiene: no console.log added, no debug leftovers, comments are explanatory and reference the finding id.

## Phase 2 — Build & tests (independent, at head 14d50e3)

| Command (cwd = worktree root) | Result | Log |
|---|---|---|
| `node --test agent-team/tests/unit/ agent-team/tests/integration/` | exit 0 — **tests 108, pass 108, fail 0** | `logs/full-suite.log` |
| `node --test agent-team/tests/unit/doctor.test.mjs` | exit 0 — **19/19 pass**, incl. `ok 18` + `ok 19` (both QA-263-016 tests) | `logs/doctor-unit-tests.log` |
| `npm run agent-team:doctor` | exit 0 — `{"ok":true,"developmentReady":true,"qaReady":true,...}` — **21/21 checks ok incl. `roots-ignored`**, run while `agent-team/.worktrees` did not exist (fresh-checkout repro) | `logs/doctor-run-live.log` |
| Frontend build | **N/A — justified by scope**: zero frontend/backend files in the diff (Phase 1) | — |
| Root-cause empirical demo (`git check-ignore` bare vs child probe, dir absent) | child probe matches with dir absent | `logs/root-cause-empirical-demo.log` |

## Phase 3 — Objective evidence (QA-only surface; no app stack started)

- Generator `generate-qa-report.mjs` (evidence folder, not repo source): re-ran the doctor unit tests capturing TAP (`logs/qa-surface-tap-rerun.log` — 19/19), parsed totals + the two QA-263-016 test names, read the live doctor JSON, emitted static `qa-report.html`.
- Playwright spec `qa-report.spec.mjs` + config `playwright.qa263.config.mjs` (chromium, trace on), run from `frontend` workspace (`npx playwright test --config ...`): **1 passed, 0 failed** (`logs/playwright-run.log`; machine-readable `test-results/results.json`: `{"expected":1,"unexpected":0,"ok":true}`). Real assertions: `toHaveText`/`toHaveAttribute` on both regression rows = `pass`, totals `19/19/0`, `roots-ignored` badge = `pass`, head SHA text = `14d50e3c...`, and `expect(consoleErrors).toEqual([])` (console + pageerror listeners).
- Final screenshot: `screenshots/qa-report-final.png` (visually verified: both regression tests pass, 19/19/0, roots-ignored pass, doctor overall ok). Trace: `test-results/qa-report-QA-263-016-evide-f4f7a-0-failures-roots-ignored-ok/trace.zip`.
- Tooling note: the rtk shell hook condenses playwright stdout; the JSON-reporter run was executed via `rtk proxy` with `PLAYWRIGHT_JSON_OUTPUT_NAME` to capture unfiltered results.

## Phase 4 — Security checklist (over the PR diff)

| Area | Verdict | Notes |
|---|---|---|
| Secrets | PASS | Pattern scan of the diff incl. committed evidence logs: only 2 hits, both the literal word "secrets" inside the PR's own report tables — no tokens/keys. |
| PHI | PASS | No patient data anywhere in the diff; tests use synthetic temp repos only. |
| Logging | PASS | Doctor output remains check ids + detail strings; new detail only names config paths. |
| Input validation | N/A (recorded) | No external/user input added; probe paths derive from local config. |
| AuthZ | N/A (recorded) | Read-only local CLI diagnostic; performs no GitHub/worker mutations; auth surface unchanged. |
| Injection | PASS | Probe path built from config values but passed as **execFile-style argv array** (doctor.mjs:221-225 via `run({command, args,...})`, doctor.mjs:68-69) — no shell interpolation; worst case a malformed config value is a literal git argument. Test helper likewise uses `execFile` arrays. |
| Dependencies | PASS | No package.json/lockfile touched (diff of all package.json files: empty). Test imports are node builtins only. |
| Config | PASS | `.gitignore`/env not modified; ignore rules (`.gitignore:46-47`) unchanged and still enforced fail-closed by the check. |

## Acceptance verdict vs QA-263-016

| Expected (Codex) | Status | Evidence |
|---|---|---|
| Doctor passes on healthy fresh checkout without prior worker run | PASS | Live doctor `ok:true` with `.worktrees` absent; regression test 18 |
| Ignore validation existence-independent (synthetic child probe) | PASS | doctor.mjs:221-225; empirical demo; test 18 on real temp repo |
| Read-only w.r.t. GitHub/workers (creates nothing) | PASS | `check-ignore` only; test asserts no dir created; no GH calls in diff |
| Real temporary-git-repository regression test | PASS | doctor.test.mjs:296-379 — real `git init` + real `check-ignore`, no mocks |
| No regression of other #263 ACs / strict scope | PASS | 108/108 full suite at head; diff scope exact |

Advisory (non-blocking): F1 — prefer exact probe-path match over `startsWith` prefix match (doctor.mjs:236).

## Final Decision

**QA PASSED** — PR #293 at head `14d50e3c171a323de74536589f5ae24f564d5168` remediates QA-263-016 with objective, independently reproduced evidence and no scope or regression violations. (This gate does not merge, close issues, or comment on GitHub.)
