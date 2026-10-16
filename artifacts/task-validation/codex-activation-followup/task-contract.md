# Task Contract

## Task

Complete the authorized ClinicOS GitHub bug automation after the user changed repository configuration. Existing draft PR471, baselineff6d24a3. Diagnose the actual sandbox failure rather than accepting mocked tests as readiness.

## Impact Classification

CI runtime correction and explicitly authorized repository settings configuration only. No application/schema/production-data changes. Preserve the unrelated maintenance SQL. The user's API-based Actions credentials are now available; do not print values.

## Current Behaviour

Model/deployment credentials and auto-release are configured, and the user has now supplied CLINICOS_BOT_TOKEN; the platform integration alone cannot administer settings. Actual Codex sandbox calls return0without the expected payload output. Native diagnostics now prove payload execution and failure propagation. Node asynchronous stdout is lost; use synchronous writes while retaining exact output assertions.

## Expected Behaviour

Use existing authorized access to configure settings where possible, without overwriting unknown branch protections. Inspect actual sandbox execution/exit behavior on the native runner with fixed synthetic probes and credential-free subprocesses. Keep the original readiness assertions fully enforced.

## Acceptance Criteria

- AC1: Current Actions availability is verified with booleans only; inaccessible administrative settings are explicitly unverified and never overwritten blindly.
- AC2: On a real readiness failure, diagnostics identify marker presence, absolute-executable behavior, failure-exit propagation and relevant process execution/errors. No model request, clinical data, credentials, sandbox bypass or global policy change.
- AC3: Preserve all existing readiness assertions. Resolve the runtime fault if a supported fix is identified; otherwise retain the exact failing evidence and BLOCKED status.
- AC5: The manual-only administrative job requires the exact reviewed SHA and an administrator actor; add a cumulative exact-main ruleset requiring the Actions-owned bug-pipeline-tests check, preserving all other protections and default workflow permissions. Verify effective settings through GitHub after mutation. Credentials stay inside Actions.
- AC4: Independent QA reviews the scoped change and its source hash before delivery. No merge or deploy before actual gates pass.

## Test Plan

Native GitHub Actions actual CLI execution plus existing76regressions. Add meaningful configuration authorization, preservation and idempotency tests. New diagnostics execute only after a failing real probe and use fixed shell/echo payloads. No mirror tests for logging. Independent QA reviews credential boundaries and retained assertions; unchanged frontend build evidence can be carried forward.

## Evidence Plan

Native logs and runtime outcomes, independent QA report/manifest and validation-report.md in this packet. Report configured secrets as availability only; no provider key validity is claimed without actual authentication. No paid model or release until runtime and configuration gates pass.

## Gate Status

READY FOR IMPLEMENTATION
