# Task Contract

## Impact Classification
Security correction for demonstrated HTTP canonical credential alias disclosure. Two source files only; no provider, workflow, clinical, billing, or environment policy actions.

## Current Behaviour
QA4 STOPPED FAILED on d6681287161a769d82d2bc7b77fe06fa925e4ff7. Exact raw and JSON-escaped tokens now guarded, but a space-suffixed synthetic configured token is normalized by actual Web Headers/Request and its usable trimmed credential can be reflected into uploaded progress. Independent actual CLI proof, no real credentials or provider access. Fresh955PASS/3skip does not override HIGH Q4-F1. All prior four rounds and their failures remain immutable.

## Expected Behaviour
Use one immutable binding snapshot for transport and all serialization/fallback guards; no raw, escaped or effective HTTP credential alias can enter metadata, stdout, stderr or artifacts. Reject noncanonical credentials before provider requests if chosen, while failure fallback remains safe against aliases. Do not leak rejected binding values in diagnostics.

## Acceptance Criteria
- Fix actual HTTP Headers/Request normalization boundary for BOTH RAILWAY_TOKEN and GITHUB_TOKEN. Choose minimal consistent normalization snapshot or fail-closed rejection; all output guards MUST include effective usable HTTP aliases even when rejecting raw bindings. Handle leading/trailing SP and HTAB, invalid control/header values with finite own diagnostics; do not impose guessed credential format.
- Initial source/target/context/active identity must be safe before mutation. Initial alias reflection zero deployment calls; mutated native reflected ID exactly one call and no retry. Safe fallback never reintroduces raw/JSONescaped/HTTP-canonical secret. Preserve already-safe progress and current source/target/trigger/deadline/retry/readiness checks.
- Fresh actual CLI synthetic regressions for both bindings and effective Headers/Request aliases, original three exact reflection cases and safe success/failure/resume. Scan all files/stdout/stderr for raw/effective/escaped values. Preserve QA4 old harness/failed attempts; copy into NEW private paths only.
- Source only these two paths plus NEW safe packet; hardlinks privatized, original and all old public/private proof hashes/inodes frozen. Root sole Git/GH/state/provider writer. Author readonly Git, credential-free trusted verification, no real network/provider/PC/Max/clinical actions.
- Integrating actual main fbaa is root work AFTER author STOP; fresh independent QA on resulting final combined source BEFORE actual Claude2/native6/final Codex/protected merge. No author claims of deploy authorization or online resolution.

## Scope
- agent-team/src/bug-pipeline/demo-deployment.mjs
- agent-team/tests/bug-pipeline/demo-deployment.test.mjs

## Test Plan
Meaningful actual CLI/unit adversarial tests and targeted workflow/configure regression, preserve all exit statuses and failures. Root may retain already-passing unchanged source checks by exact identity; final combined source full regression once during independent QA, not blind repeats. No real credentials, provider deploy, billing fallback or new clinical tests.

## Evidence Plan
Private /workspace/.clinicos-cloud/demo-exact-author5-20261019; NEW public artifacts/task-validation/demo-exact-commit-release/codex-followup-3. Safe MD/JSON only, no ignored raw log force-add. QA4 report and sealed finding remain immutable. Author STOP before next independent phase; no retrospective BEFORE session.

## Gate Status
READY FOR IMPLEMENTATION only after authenticated user-session implementation allowance four to five, canonical reservation and readback. User already explicitly authorized continuation until resolution while conserving history. No repeated permission required. All release/provider gates still pending.
