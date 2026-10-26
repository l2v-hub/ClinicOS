# Task Contract

## Task
- Title: Retain safe failed verification evidence and explicitly archive unavailable output
- Slug: failed-clinical-output-retention-20261026
- Type: bugfix
- Date: 2026-10-26

## Current Behaviour

Real normal clinical executions completed with valid typed model results in run40307355899, then both correction plans failed at verify-before. The controller retained checkpoint hashes but the ephemeral source bytes and failed-command output were unavailable after the runner ended. Workflow success represented a partial controller result, not successful verification. A separate zero-provider control40312718377 passed the same trusted sandbox, PostgreSQL16, all59 migrations and Node marker; the earlier clinical command failure cause remains unknown.

## Expected Behaviour

Retain bounded sanitized command evidence and guarded immutable failed source artifacts on both partial exit zero and thrown controller errors. Allow a genuinely authorized trusted host to archive a known FAILED verification checkpoint only after an independently observed terminal runner and unavailable output, retaining its full history and all attempt counts. Then existing recovery can restore a separately identified clean published baseline and start a genuinely new attempt.

## Acceptance Criteria
- AC1: Record the actual command/index, exit status, finite runner error, sanitized captured byte counts/hashes and bounded safe excerpts without changing command results, verification caps or timeouts.
- AC2: Export only exact checkpoint-owned allowed plan source files with verified paths, regular-file identity, hashes, sizes and modes, bounded text/patch/manifest, and immutable destinations. Refuse secrets, sensitive paths, traversal, symlinks and media before source or patch writes.
- AC3: Always schedule artifact upload, including partial controller exit zero and throw. Local export alone never implies remote durability.
- AC4: Explicit OUTPUT_UNAVAILABLE transition requires exact known FAILED verification progress, a valid canonical checkpoint, independent terminal artifact observation and genuine one-shot external authorization. Preserve FAILED status, failure code, failed step, attempts, source, reviews, budgets and complete previous progress; remove only the current checkpoint.
- AC5: Reject malformed or stale checkpoint metadata, running/unknown publish outcomes, absent/default authorization, observer mismatch and replay before consuming authority or changing state. Existing unknown-output and retained-worktree refusals remain.
- AC6: Preserve original source1 and QA1 BLOCKED3 evidence; correct the three findings with actual regression tests and new independent exact-byte QA. Complete native packet verification, six current-head checks, genuine Claude review, new final Codex and ordinary protected merge before a new clinical provider attempt.

## Test Plan

Actual native fixtures for emitted diagnostics, safe immutable code export and refusals, workflow partial/throw artifact behavior, native unavailable-output capability and history preservation. New tests reproduce spaced credential assignment leaks and malformed output inventory rejection. Run the actual required bug-pipeline test domain, actionlint and diff checks. Provider invocations in these fixtures are zero.

## Gate Status

This is pre-publication evidence. Current-head CI, genuine peer review and final independent review are sequential later gates and are not claimed complete here. Clinical506/507 remain blocked and unmerged.
