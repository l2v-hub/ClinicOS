# Task Validation Report

## Task

- Title: QA-263-016 doctor fresh-checkout ignore probe fix
- Slug: qa-263-016-doctor-fresh-checkout-ignore-probe-fix
- Issue: #263 — Codex QA finding QA-263-016 (severity high, maps to issue AC2)
- Commit: 2ef3d1d (branch `fix/263-qa-016-doctor-fresh-checkout`; SHA finale nel commento evidenza su #263)
- Date: 2026-07-20

## Implementation Summary

The `roots-ignored` doctor check probed the bare `runtimeRoot`/`worktreeRoot` directory paths with
`git check-ignore`; on a fresh checkout where those directories do not exist yet, git returns
nothing for the bare path, so doctor exited 1 on an otherwise healthy clone (false negative,
QA-263-016). The check now probes a synthetic child path under each root
(`<root>/.doctor-ignore-probe`) — always covered by the committed parent ignore rule regardless of
directory existence — and validates that a listed path starts with each root prefix. The probe is
read-only: nothing is created on disk.

## Files Changed

- `agent-team/src/commands/doctor.mjs` — existence-independent probe-child `check-ignore` command + prefix-based validation (C-quoted Windows path normalization retained).
- `agent-team/tests/unit/doctor.test.mjs` — mocked-run tests updated to the new command shape; two NEW real-temporary-git-repository regression tests (required by the finding).

## Acceptance Criteria Result

| AC                                                                     | Result | Evidence                                                                                                                                         |
| ---------------------------------------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 — probe on synthetic child paths, never bare dirs, read-only       |   PASS | `doctor.mjs` `roots-ignored` args; regression test asserts `agent-team/` NOT created after run (`logs/doctor-unit-tests.log`)                    |
| AC2 — real temp git repo with ignore rules, dirs absent → check passes |   PASS | test `doctor passes ignore validation on a real fresh checkout where the roots do not exist (QA-263-016)` — ok (`logs/doctor-unit-tests.log`)    |
| AC3 — real temp git repo without rules → fails closed naming roots     |   PASS | test `doctor fails closed on a real repository whose gitignore lacks the root rules (QA-263-016)` — ok, detail names `.runtime` and `.worktrees` |
| AC4 — existing behaviours preserved, full suite green                  |   PASS | 108/108 pass, 0 fail (`logs/agent-team-full-suite.log`)                                                                                          |

## Test Results

| Test             |                             Result | Evidence                                                                                                      |
| ---------------- | ---------------------------------: | ------------------------------------------------------------------------------------------------------------- |
| Unit             | PASS (19/19 doctor; suite 108/108) | `logs/doctor-unit-tests.log`, `logs/agent-team-full-suite.log`                                                |
| Integration      |         PASS (included in 108/108) | `logs/agent-team-full-suite.log`                                                                              |
| API              |                                 NA | no backend change                                                                                             |
| Playwright       |                                 NA | CLI-only subsystem, no UI touched; objective evidence = deterministic real-git regression tests per Test Plan |
| Persistence      |                                 NA | no data change                                                                                                |
| Agnos AI         |                                 NA | not touched                                                                                                   |
| Voice            |                                 NA | not touched                                                                                                   |
| OCR              |                                 NA | not touched                                                                                                   |
| Security/privacy |                               PASS | read-only git probe; no secrets/PHI in logs; `npx prettier --check` clean                                     |

## Runtime Evidence

`npm run agent-team:doctor` on this workstation: `ok:true`, `developmentReady:true`,
`qaReady:true`, all 21 checks green including `roots-ignored` — `logs/doctor-run-local.log`.
The fresh-checkout scenario itself is exercised by the real temp-git-repo regression tests
(this workstation already has the runtime dirs, so the local run alone would not prove it).

## Logs

- `logs/doctor-unit-tests.log` — 19/19 pass (includes both QA-263-016 regression tests)
- `logs/agent-team-full-suite.log` — unit+integration 108/108 pass, 0 fail
- `logs/doctor-run-local.log` — real doctor run, all checks ok (sanitized: JSON check output only)

## Residual Risks

- `git check-ignore` echo format differences across git versions (C-quoting on Windows) — covered by the retained normalization logic and its updated test; the regression tests run real git so environment divergence surfaces in QA instead of staying mocked.

## Final Decision

CLOSED — VERIFIED

Nota di processo: questa decisione chiude il task-contract locale (fix implementata e verificata da
test reali). La issue #263 resta OPEN: lo stato dichiarato verso il team è **READY FOR CODEX QA** —
Codex è l'unico QA gatekeeper e ri-esegue il gate sull'evidenza allegata alla issue al commit SHA
pushato.
