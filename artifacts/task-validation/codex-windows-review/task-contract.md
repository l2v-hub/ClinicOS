# Task contract — Windows review activation

## Impact Classification

Automation and Windows compatibility follow-up to PR471. User's screenshot proves PowerShell in C:\Workspace\ClinicOSHouse: checkout blocked by pre-existing local files, then MODULE_NOT_FOUND. Preserve all those files and unrelated demo-cleanup SQL. User authorizes autonomous preparation and execution where accessible; current tools execute in cloud Linux and the desktop-terminal bridge failed. No remote Windows shell is available.

## Current Behaviour

The installer supports POSIX cron only and previous instructions requested switching a dirty checkout. No scheduler was installed by those failing commands. Current cloud has no Max login or persistent personal Windows desktop access. No real provider review was performed.

## Expected Behaviour

Provide a dedicated Windows checkout bootstrap which never switches, stashes, resets or cleans the user's existing project. Install/check/remove a five-minute current-user Interactive/Limited Windows Task Scheduler entry using cached personal Max/Pro auth. Preserve unrelated tasks and files, verify exact task/config and prevent overlap. Support native Claude and npm JavaScript entrypoints without a command shell. Retain model credential isolation, durable budgets and existing review/main gates.

## Acceptance Criteria

1. Windows bootstrap uses a separate destination and preserves existing dirty/foreign/nonmatching work; only fast-forwards the dedicated checkout.
2. Installer diagnoses native CLI, cached subscription, GitHub and scheduler prerequisites without model calls or token copying. No admin/password/highest-privilege task requested.
3. Exact owned action, user, five-minute interval, enabled state and overlap setting are verified; malformed/foreign/concurrent tasks fail closed. Remove only the verified task.
4. Config/state remains outside Git with user ACL; no redirected state, arbitrary shell injection or provider keys. Real launcher preserves worker status and interrupted lock.
5. Node runner supports Windows OS paths and npm JS CLI while excluding GH/deploy/API credentials from subscription reviewer.
6. Tests include real child execution and native Windows PowerShell parser/Task Scheduler object checks. Separate mocks, native checks and actual personal installation; do not claim remote execution on the user's PC.
7. Independent QA, required native Linux check and Windows CI must pass before handing off. PR remains reviewable, no issue starts, ledger reset, merge or production deploy.

## Test Plan

Scoped regression suite, native Windows-only tests for PowerShell and scheduled-task definitions, real synthetic worker exit/lock/credential tests, existing sandbox HTTP/Postgres checks. No real provider or personal scheduler mutation.

## Evidence Plan

Independent QA report/manifest, test output, native Actions links and safe QA-only result screenshot/trace/video. Historical packets remain tied to their original source; this packet covers modified installer/runner files.

## Gate Status

READY FOR IMPLEMENTATION

## Branch and integration context update

Independent read-only GitHub inspection confirms PR471 was merged at2026-10-16T22:44:40Z, merge commit `d7e070a5a3c156f3c9216b4f2d18d0dc1e7c7ee3`. That user integration is the base for this separate Windows follow-up branch `codex/windows-claude-review`; the Windows source is not established as integrated by the earlier PR. The bootstrap target and matching native fixture branch now select this Windows branch. Remaining reviewed implementation bytes are unchanged. Windows/Linux native CI for a new draft PR remains pending; no personal task or provider execution is implied.
