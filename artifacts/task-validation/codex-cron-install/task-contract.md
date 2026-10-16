# Task contract

## Impact Classification

Automation-only follow-up to PR471. User asks for the cron in the repository and what is needed to start existing issues. Preserve unrelated cleanupSQL; do not process issues, reset review budgets, merge before review, or change clinical code/data.

## Current Behaviour

Codex's15minute GitHub schedule and external Claude review worker exist only in the unmerged PR. The Claude worker has no versioned periodic installation. Current cloud has no `crontab` and no Claude Max login. There are19 open issues, zero `codex-run`, six `ready-for-qa`. Current integration cannot list repository runners (403); do not infer that no runner exists.

## Expected Behaviour

A versioned five-minute user crontab plus one installer command on the user's persistent, already authenticated Mac/Linux machine. No Actions Claude token or API billing fallback. Preserve other crons, avoid overlapping review processes, verify the installed entry and clearly distinguish installation from real provider execution. Main integration remains gated by the actual Claude review.

## Acceptance Criteria

1. Versioned five-minute schedule, absolute executable paths and correctly quoted repository/state paths.
2. Require own Claude Code Pro/Max login, GitHub write access, valid checkout and `crontab` before installation; never invoke a model or copy credentials.
3. Preserve unrelated user crons; idempotent install/check/remove; fail closed on unreadable, malformed or concurrently changed crontab.
4. Private launcher/log state outside Git; no API/OAuth secrets in files; safe non-overlap lock and underlying exit status retained.
5. Meaningful tests cover missing prerequisites, denied read, concurrent edits, quoting/cronpercent, real launcher execution, failures and lock behavior.
6. Actual cloud check reports blocked prerequisites accurately. Never claim a personal cron is running here. Explain minimal user action and issue opt-in (`codex-run` or `/codex fix`); do not silently requeue existing QA work or every open issue.

## Test Plan

Complete scoped bug/helper suite plus native required CI. Synthetic crontab process boundary and real POSIX shell launcher; no real provider or user scheduler mutation in tests. Independent QA reviews source, evidence and failures.

## Evidence Plan

Recorded test output, source manifest, actual non-mutating prerequisite report and independent QA validation. Internal installer evidence surface if required by QA; existing dashboard is unchanged.

## Gate Status

READY FOR IMPLEMENTATION
