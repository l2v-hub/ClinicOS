# Independent precommit supplement — PR474

Verdict: READY FOR CODEX QA for the native fixture correction, associated documentation and QA metadata display. Full PR gate remains PARTIAL pending fresh exact-SHA CI, installed-state rebinding and the actual bounded Claude Max review.

## Frozen native source

The corrected native test file remains SHA256 `ba1c5a5fbd4845668ad687f4ad91000f4f17f636e4b210085a235a3fa605dd0a`, identical to the independent 10/10 PASS manifest. No native rerun was needed or performed for the documentation-only addition. `git diff --check` remains clean.

## Documentation and scope/security

Reviewed the new Windows Store/MSIX and native-test paragraphs in `docs/codex-bug-workflow.md`. They accurately retain fail-closed path checks, require the explicit Git-verified physical destination, limit the corresponding LOCALAPPDATA setting to the install/check process, prohibit global environment changes/credential copying, and warn about removing the MSIX app. They do not claim that generic logical alias canonicalization is fixed.

The second paragraph accurately explains DACL-only mutation, owner/protection assertions, process-only RemoteSigned and unchanged global/GPO policies. No credential, clinical identity, dependency, application, auth-policy, schema or deployment change was introduced. No assertion was disabled. The source delta remains one native-test file plus explanatory documentation; QA packet artifacts are separate.

## Broad Windows matrix — retained RED

Read the root run `full-1792193776736/receipt.json` and failure output, not merely the summary. Actual result: 130 tests, 116 PASS, 13 FAIL, 1 existing SKIP, exit 1. It is not a green full regression gate and is not waived or relabelled by this supplement.

- Six cron-install failures encounter the CRLF template `{{COMMAND}}\r` where the POSIX installer expects LF-only content, including cases that fail before their deeper concurrency/privacy checks.
- Five symlink security fixtures cannot create their synthetic symlink under this Windows token (`EPERM`), so their intended fail-closed assertions are not exercised by this run.
- One login-path test hardcodes `/tmp/isolated-login-probe/`, which is not the Windows normalized path.
- One isolated-config test requires POSIX mode 0700; its child returns false on Windows, which does not implement those POSIX permission bits as asserted.

These explain the observed failures without proving those security properties on Windows. No scope expansion or assertion weakening was made. The repository workflow explicitly runs the native suite on Windows and the broad suite on Ubuntu. A new Linux job for the final commit is still required; earlier remote green results cannot be rebound to an untested new SHA.

## Browser evidence audit

Reviewed the actual `browser.spec.mjs` and `browser.config.mjs`, `runtime-snapshot.json`, native `.last-run.json`, presence of `trace.zip`, `video.webm` and the generated HTML report. The native browser result is PASS with no failed test IDs; the single scenario checks metadata, reload persistence and empty page/console/HTTP error collection. No provider or clinical application route is used.

Visually inspected `windows-result.png`. It is readable, fully laid out without visible clipping, uses only task/test metadata, and prominently identifies itself as a QA-only display that does not command the scheduler. It shows PT5M, Ready, last result 0, Limited/Interactive and the captured last/next times; it also explicitly displays `reviewExecuted=false` and states that cron empty is not review evidence. No clinical data or credentials are visible.

This is an honest rendered snapshot captured at 2026-10-17 01:39:15 +02:00, with next run then scheduled for 01:43:05 +02:00. It is not a live scheduler, final installed-SHA proof, full PR review or later scheduling guarantee. Root must refresh or contextualize these timestamps before final publication. The screenshot's source-state label correctly says baseline plus the native-test correction, not a clean final committed SHA. Root's final report did not yet exist when this supplement was written, so that report is not independently certified here.

No additional test/model calls, remote writes, counters, installed tasks or user files were changed by this supplemental audit.
