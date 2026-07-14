# Task Validation Report — attempt 6 (remediation)

## Task
- Title: Agent Team LLM-first con Claude development loop e Codex QA indipendente
- Slug: 263-agent-team-llm-first
- Issue: l2v-hub/ClinicOS#263 · PR: #264 (draft, unchanged)
- Attempt: 6 (remediation of Codex qa_result comments 4967120522 attempt 4 and 4967217638 attempt 5, decision qa-failed)
- Claim: comment 4967240019 (work.claim attempt 6, lease c5f9b01e-bdf5-4360-ab8b-8fff7d34cb78, refreshed during execution)
- Branch: codex/agent-team-architecture (same branch, same worktree C:/tmp/ClinicOS-agent-team, same draft PR)
- Date: 2026-07-14
- Producer: claude-development worker (Claude Code)

Attempt-3 report is superseded by this attempt but remains committed in history at the attempt-3
SHA; Codex QA artifacts (`codex-qa-report.md`, `agent-team/qa-result*.json`) are preserved
byte-for-byte, including the new verbatim `qa-result-attempt-4.json` and
`qa-result-attempt-5.json`.

## Remediation summary

Both open findings resolved with strict RED→GREEN TDD:

- **QA-263-012 (medium, ci-configuration / AC6)** — the `browser-e2e` job of
  `.github/workflows/ai-import-e2e.yml` built the production Vite frontend without
  `VITE_API_URL`, so `frontend/src/config.ts` baked the Railway production fallback into the
  bundle and the browser test never reached the CI backend/mock runtime. The smallest safe
  correction adds `VITE_API_URL: http://localhost:3001` to the browser-e2e **job env only**
  (build-time binding for both deterministic desktop/tablet paths). Production fallback behavior
  in `frontend/src/config.ts` is untouched and now pinned by a dedicated regression test.
- **QA-263-013 (high, recovery-worktree / AC11)** — four coordinated fixes:
  1. `git.mjs prepareIssueWorktree` no longer adopts recorded coordinates blindly: it validates
     existence, expected branch (`rev-parse --abbrev-ref HEAD`), and expected repository
     (`remote get-url origin` vs configured repository). Stale coordinates are safely repaired:
     a live checkout of the same branch is reused; otherwise dead registrations are pruned and
     the worktree is recreated from the existing branch. No destructive git command
     (remove/‑D/‑B/--force/reset) exists on any recovery path; occupied directories or missing
     branches fail closed.
  2. `process-runner.mjs` refuses a nonexistent `cwd` with the unambiguous diagnostic
     `working directory does not exist: <cwd>` instead of node's misleading
     `spawn claude ENOENT`.
  3. `runtime.mjs runDevelopment` failure path now returns the issue to the configured claimable
     development state: after the claim release it removes `agent-working` and restores
     `ready-for-dev` + `assigned-to-claude` — no more orphaned agent-working with no active claim.
  4. `reconciler.mjs` exports `reconciliationOutcome` and `once.mjs` uses it: a pass with
     populated `development.errors`/`qa.errors` returns `ok:false`, which `cli.mjs` already maps
     to process exit 1 — `agent-team:once` reports worker failure unambiguously.

Finding-by-finding detail: `remediation-map.md` (attempt-6 section).

## TDD Record — attempt 6 (each RED observed before production code)

| Cycle | Finding | RED (exit ≠ 0) | GREEN |
|---|---|---|---|
| A6-1 CI browser-e2e frontend binding | QA-263-012 | tdd/a6-1-ci-binding-red.txt (1 fail: missing VITE_API_URL in browser-e2e job) | tdd/a6-1-ci-binding-green.txt (2/2) |
| A6-2 worktree recovery + invalid cwd | QA-263-013 | tdd/a6-2-worktree-recovery-red.txt (5 fail: blind adoption, no recreation, no fail-closed, foreign repo adopted, misleading ENOENT) | tdd/a6-2-worktree-recovery-green.txt (11/11) |
| A6-3 failure labels + once outcome | QA-263-013 | tdd/a6-3-failure-reporting-red.txt (2 fail: agent-working left behind, missing reconciliationOutcome) | tdd/a6-3-failure-reporting-green.txt (6/6) |

## Fresh verification (real timestamps in checks/command-log.jsonl)

- `node --test --test-reporter=tap agent-team/tests/unit/*` → `test-results/unit.tap` (exit 0, 73/73)
- `node --test --test-reporter=tap agent-team/tests/integration/*` → `test-results/integration.tap` (exit 0, 17/17)
- `node agent-team/src/cli.mjs doctor` → `checks/doctor-smoke.json` (exit 0, 21/21 checks ok)
- `cmd /d /s /c npm run build` → `checks/build.txt` (exit 0, frontend + backend)
- `git diff --check origin/main...HEAD` → `checks/git-diff-check.txt` (exit 0, empty)
- static secret/prohibited-action scan of every touched file → `checks/a6-secret-prohibited-scan.txt` (clean)

Full suite after both fixes: 90/90 (73 unit + 17 integration).

## New/changed tests

- `ci-browser-e2e-config.test.mjs` (new): deterministic validation that the browser-e2e job binds
  `VITE_API_URL` to `http://localhost:3001` for its build, and that the production fallback in
  `frontend/src/config.ts` (Railway URL + PROD/dev selection) is unchanged.
- `git-worktree-recovery.test.mjs` (new): stale recorded path never blindly adopted (live checkout
  of the branch reused); recreation from the existing branch with `worktree prune` and without any
  destructive command; valid coordinates reused as-is; occupied wrong-branch directory fails
  closed; foreign-repository worktree never adopted.
- `process-runner.test.mjs`: nonexistent cwd refused with `working directory does not exist`,
  explicitly not `spawn node ENOENT`.
- `remediation-loop.test.mjs`: failing worker restores `ready-for-dev` + `assigned-to-claude` and
  removes `agent-working` (in the same test that already asserts the schema-valid claim release).
- `once-failure-reporting.test.mjs` (new): `reconciliationOutcome` marks passes with development
  or QA errors as failed; `once` run against an injected fake runtime returns `ok:false` when the
  development worker fails with the invalid-cwd diagnostic.

## Security / privacy

- The recovery path passes commands as argument arrays only; no untrusted issue content reaches a
  shell string; no destructive git operation exists on any recovery path.
- The invalid-cwd diagnostic is sanitized through `sanitizeText` like all runner errors.
- Evidence contains no secrets, account identifiers, or clinical content
  (`checks/a6-secret-prohibited-scan.txt`).
- Workflow change adds a localhost-only build-time URL to a CI job; no production configuration,
  fallback, secret, or deploy path is touched.

## Evidence binding (QA-263-005 architecture, unchanged)

Committed manifest binds artifacts at its evidence commit; the authoritative `evidence_binding`
envelope is generated after the final commit, published as a protocol comment bound to the exact
PR head, and machine-verified with `verifyEvidenceBinding` (blob IDs + committed contents read
from the commit). The dogfood verification result of this attempt is recorded in the handoff
comment.

## Final Decision

READY FOR CODEX QA
