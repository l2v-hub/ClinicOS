# Task Contract

## Task

Activate and verify the GitHub bug workflow requested by the user; diagnose actual credentials/runner constraints. PR #471, baseline 255d9917, 2026-10-16.

## Impact Classification

Runner process isolation, compatible GitHub runner selection and CI readiness checks only. No application/schema/patient data changes. Preserve unrelated cleanup SQL. Credential values must not enter logs or code.

## Current Behaviour

The runner creates HOME but passes a nonexistent CODEX_HOME to the pinned CLI on fresh hosts. Actual sandbox execution then fails before performing the verification command. Mock adapter tests do not detect this integration failure. Local Claude is unauthenticated and GitHub administration requests return 403.

## Expected Behaviour

Create private isolated CLI configuration directories before launch. Verify a real CLI sandbox in the native GitHub runner without model credentials or paid calls. Diagnose remaining external access prerequisites and activate the full workflow only when its review/authentication gates can be satisfied.

## Acceptance Criteria

- AC1: Each non-controller child has preexisting private HOME, CODEX_HOME and CLAUDE_CONFIG_DIR directories on a clean runtime root. Repeated runs preserve files; role credential separation remains enforced.
- AC2: CI executes the pinned actual Codex sandbox and verifies the command output; a failed real sandbox fails readiness. No provider secrets, disabled sandbox or fabricated success.
- AC3: Exact credential/admin readiness is checked without exposing values. Real review/activation is not claimed when blocked by unavailable credentials or HTTP 403.
- AC4: Relevant regression suite and independent QA cover the final diff before delivery. The same PR is updated and no review/deployment gates are bypassed.

## Test Plan

Real subprocess directory/mode/repeatability tests plus existing pipeline/Claude review regression tests. Native GitHub Actions sandbox probe. The initial ubuntu-latest probe failed at bubblewrap loopback setup; compare ubuntu-22.04 for host compatibility while retaining the same sandbox and assertions. Read-only auth/API diagnostics. Independent QA phases apply; no production data or artificial paid bug processing until credentials and trusted-default-branch gates are usable.

## Evidence Plan

Sanitized logs, native CI link, independent QA findings/hash manifest, and a validation report in this packet. Actual end-to-end execution requires supported credentials and default-branch integration; unsupported publication or credential extraction is prohibited.

## Gate Status

READY FOR IMPLEMENTATION
