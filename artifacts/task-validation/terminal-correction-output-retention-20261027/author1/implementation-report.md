# Native known-terminal output retention — frozen source

Reservation125dd7c5-2bc2-4f52-b839-7c5c9d57f14e, base655f028e3b0bdcc621ac15209fd0af38cee3d26b. Exactly three native source files and one new regression file changed. Existing failed-output-retention.test.mjs and the large workspace.test.mjs remain byte-identical. Git was used read-only for source checks; temporary synthetic fixture repositories were owned and removed by test hooks. No shared Git mutation, external API, canonical state, application data, dependency install or provider invocation was made by this author.

## Change and invariants

The CLI and exporter share knownTerminalFailure, which reuses unchanged native knownFailedCorrection and adds the strictly equivalent initial unpublished failure class. It accepts only actual failed execute/simplify/QA/verification/revision classifications, matching source/plan/feedback/attempt identity with no active model/review, release, publishing or inconsistent pending step. Evidence/scope-invalid and unknown/running/interrupted/publish outcomes are refused. Existing initial verification retention is preserved. This predicate grants no resume, retry, budget or authority.

The native workspace records a typed status:blocked result for executor/simplifier/QA in a per-attempt packet file before the failure checkpoint. Safe summaries are retained or line-redacted; invalid/oversized/control-containing text is explicitly omitted. The original summary content hash and disposition are recorded without raw unsafe text. Existing model result status and controller failure behavior remain unchanged; an unsafe native QA result still stays unknown/running and is not exported.

The exporter requires the exact live physical checkpoint and existing source/base/plan/scope/path/hash/mode/secret protections. Only the fixed current-stage typed report is eligible; exact schema, blocked status, round/step, safe bounded summary and checkpoint file hash are checked. Missing report is not-recorded, invalid/unsafe report is explicitly unavailable, and neither is turned into approval or fabricated report content. Exported reports retain exact captured bytes and hash. Raw QA markdown and arbitrary packet files are not copied. The artifact remains a partial source/diagnostic export, not a reconstruction of a lost worktree. Existing file-count, source/patch, per-file and total byte caps remain; report bytes consume the existing total budget. Earlier attempts are never overwritten.

Controller loops, model invocation, budget, authorization, review and release policy are unchanged. This patch cannot recover the already lost #506 attempt7 code or QA summary, whose artifact inventory contains only diagnostic and verification files.

## Actual validation

- Native Task Contract validated before source edits.
- Final genuine behavioral RED17:9PASS/8FAIL. Initial fixture boundary/missing-issues setup failures are separately preserved and are not called behavioral RED.
- Final focused native production-controller/workspace/export tests49/49PASS, with synthetic model callbacks, owned real Git/worktrees and actual owned Node assertions. The sandbox/process boundary is injected; no actual provider, Codex sandbox or database call is claimed.
- New35 cases cover initial/correction model stages, verification/revision classifications, changed physical output, active/unknown/publish/scope/plan/feedback/source/round drift, safe/missing/invalid reports, actor-independent status preservation, secret redaction, oversized/control summaries and unknown unsafe QA.
- Required CI command coverage, read from accepted bug-pipeline-tests.yml:35 bug-pipeline files plus scripts/quality-gate/claude-bug-review.test.mjs and scripts/automation/protect-demo-secret.test.mjs. Across these actual37 files:1738total,1735PASS,3WindowsSKIP,0FAIL. The unchanged35-file and two-file runs are recorded separately; no claim of a remote CI run is made.
- Final Node syntax, Prettier and git diff whitespace checks PASS. Four source hashes stayed identical during the full required suite. Existing two large/focused test files remained byte-identical.

An additional broader62-file run is preserved unchanged:1757PASS/34FAIL/3SKIP. Missing sparse fixtures explained its initial setup failures and were restored byte-exact from the base; the complete required domain then passed. Rechecking the two broader static-source files found2PASS/3 stale regex/assertion failures on exact unchanged baseline tests and frontend/journey inputs (identity proof preserved). The separate process-ownership integration failure observed a zombie PID, with its test/fixture/process-runner byte-identical to base. Those extra outcomes remain failures; no existing test, skip, timeout or production behavior was changed to hide them. They are outside the actual37-file required command.

## Final Decision

PARTIAL — source is implemented, tested and frozen for a new independent QA session. Real peer review, six native checks, final Codex QA and protected merge are pending. Clinical corrections, deploy, issue closure and full autonomous recovery remain separate and incomplete.
