# Task Contract — PR494 second implementation, actual Claude findings

## Task and provenance
Same standalone-pr-494 entity; prior implementation1, original adoption/provisional packets, QA and actual Claude comment6253738333 remain immutable. Base publication dfd2f1575ab449507a207a2357da2a63c86e5b4f. Root owns reservation/GitHub/commit/release. New packet artifacts/task-validation/standalone-pr-494/codex-followup-1/. Author starts only after durable implementation2 reservation readback.

## Impact Classification
Python metadata transport, log parsing, diagnostics, public comment idempotency and workflow documentation. No app/frontend/DB/clinical/auth/provider semantics or dependency changes. No browser is applicable to this stdlib command. Security and data projection remain fail-closed.

## Current Behaviour
Actual read-only Claude review found the fixed hosted log begins with UTF8 BOM and has SGR color escapes, rejected by the synthetic-tested parser. Three CI failures are present; root has not downloaded their bytes. HTTP stage/status, artifact expiry and main drift are indistinguishable; foreign comments can squat the marker. Publishing report during a target's active review changes its feedback fingerprint.

## Expected Behaviour
Correct actual F1–F4 without widening destinations, permissions, metadata provenance, raw-public-output or provider operations. Preserve all earlier packets/source identities and uncertainty about actual hosted execution.

## Exact scope
Only scripts/automation/recover-demo-topology-receipt.py, scripts/automation/recover-demo-topology-receipt.test.py, .github/workflows/recover-demo-topology-receipt.yml. New reports/tests/harnesses only in new packet. No unrelated source, schema/dependencies, prior packets, main/ref/GitHub/provider edits by author.

## Acceptance Criteria
1. Decode UTF8 strictly, remove at most one leading BOM and recognized bounded SGR sequences before timestamp/TAP parsing/title hashing; retain fetched raw-byte hash and raw/decompressed size limits. Reject NUL, bare ESC and unsupported control/escape sequences. Do not interpret cursor/OSC/control sequences. Exact plain versus colored titles produce same SHA. Test BOM+SGR inside/outside step, title coloring and malformed/unsupported escapes.
2. Transport failures expose only validated numeric HTTP status and constant API versus storage stage codes; never URL, headers, body, message or token. Distinct ARTIFACT_EXPIRED stops before archive call, MAIN_MOVED stops before publication. Retain constant fallback for unknown exceptions, TLS, fixed-host redirects and token separation. Test storage403 secret URL suppression, API statuses, expiry/no download and second freshness failure/no mutation.
3. Foreign marker-bearing comments cannot permanently deny publication: either ignore noncanonical bot authors while keeping exact-body/real bot/type checks and bot mismatch conflict, or report distinct foreign-marker code. Prefer safe ignoring with explicit tests. Malformed metadata, duplicates or conflicting canonical bot comments remain fail-closed; accepted-lost POST rerun writes only once.
4. Workflow/packet documents actual artifact expiry2026-10-25T17:39:03Z and dispatch only with no target review in flight (or consciously require renewed review). No controller/handoff behavior changes.
5. Full candidate offline suite plus fresh independent adversarial tests pass. Scope/source/proof hashes bind actual tested bytes. No source run with credentials, real API/provider calls, browser or production claims. Fresh independent QA after author stop, actual Claude review of new SHA and later fresh final Codex review remain required.

## Test Plan
Run stdlib offline tests with sockets blocked and scoped syntax checks. Add fixtures exercising real reported format, not invented real-byte provenance. Preserve all existing regression/security assertions except replace the incorrect blanket SGR-rejection test with narrow normalization plus rejection of unsupported escapes. Fresh independent QA checks actual implementation/security/limits; no disabling tests, skipping checks or relaxing timestamp/schema/provenance to force success.

## Evidence Plan
New packet includes analysis/plan, per-finding response, actual offline results, source freeze/hashes, all previous proof hashes, fresh independent report and scans. No raw real logs, signed URLs or credentials. Public files≤25MiB. Prior proofs preserved byte-for-byte. Root may request sanitized independent real log evidence from Claude via GitHub comments separately; do not fabricate it or use PR code to analyze authenticated data.

## Gate Status
READY FOR IMPLEMENTATION after matching implementation2 root reservation is persisted/read back. Not ready for release. No additional user permission is needed within existing authorized workflow.
