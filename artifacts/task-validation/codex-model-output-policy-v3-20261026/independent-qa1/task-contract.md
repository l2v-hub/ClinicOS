# Independent QA task contract

Code: `38b37e3322176bd9836d228d4c4ce63bf66fced2`; base: `995e2ff6d14a96b5d67e0d14d708f4a95c4c816f`.
QA nonce: `26a7189c-6330-45ec-b019-ca73be5f13f6`; state: `a36a294cd13e23122e547928a365bd8e447053f1`.

## Impact Classification
Internal process runner and model diagnostics: yes. Privacy/security: yes. Frontend, backend routes, database, auth, workflows, dependencies: no source changes.

## Current Behaviour
The previous 64 KiB combined process-output limit kills a synthetic Codex session before reading its separate valid typed result. The historical clinical failure exact cause remains unknown.

## Expected Behaviour
Allow at most 2 MiB total process output; retain 32 KiB tails per stream; independently fail above 64 KiB stderr; preserve 30-minute model timeout, process-group termination, typed-result guards and other caller defaults. Emit only finite categorical diagnostics and safe counts, collecting at most 64 entries. Preserve capacity cooldown and ignore ordinary source/tool progress words.

## Acceptance Criteria
1. Real synthetic child reproduces baseline RED and candidate GREEN for 80 KiB progress plus valid result.
2. Total/stderr caps, multibyte byte accounting, bounded visible and retained backing capture, timeout and descendant kill behave as contracted.
3. Missing, empty, malformed, oversized, symlink and schema-invalid typed results fail closed; input/schema/path guards remain effective.
4. Diagnostics expose only finite enum/count fields, no raw synthetic secret or source content; unknown counts stay null; callback errors cannot change outcomes; collector stays at 64.
5. Capacity cooldown remains effective for terminal failure evidence and does not trigger for source/tool progress content.

## Test Plan
Independently run focused tests, full relevant pipeline tests, and extra real-child/negative/security fixtures. Inspect full five-file diff and all consumers. Review source-backed memory behavior, not only returned string lengths. No provider/API/network/Git mutation is permitted. Full application frontend builds and native CI remain separate and are not claimed executed.

## Evidence Plan
Sanitized synthetic-only command logs, source hashes, fixture results, findings with file/line, QA-only HTML report, Playwright screenshot/trace and report with concrete fixture-value assertions and no console/HTTP errors. No application stack or database is needed. Publication/history import remains coordinator-owned and pending.

## Gate Status
READY FOR IMPLEMENTATION (QA fixtures only; application source is immutable).
