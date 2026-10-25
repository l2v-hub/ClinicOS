# Independent cloud QA3 — FAILED VALIDATION

Reservation: `fe7976fa-c9a0-49f1-be6c-6bccfb76203b`. Exact 11-file frozen source in `/workspace/clinicos-cloud-review`, compared with published source `9ac823307f981da33e96eab33cc18d6ce139ed93`. Source before/after hashes match the reservation. Prior QA1/QA2 evidence and root lock remain byte-identical. Actual Claude review1 `6400155301`, task contract, acceptance amendment, author3 report/freeze and both prior independent reports were read. This is an independent code review, with no real provider or GitHub mutation.

## QA3-01 — Medium: preclaim semantic change publishes a review of the old specification

`agent-team/src/bug-pipeline/cloud-review-worker.mjs:404` retrieves a packet from the initial durable subject. Qualification may then wait up to two minutes. `:428` serializes that old packet; native claim at `:453` reloads the current durable subject. The only checks joining the old packet to the returned claim are SHA, base SHA and request ID at `:469`. The semantic plan/packet/source/history guard subsequently protects the **new claim snapshot**, without comparing it with the subject used to prepare the inference.

The independent `preclaim-binding-probe.mjs` uses the real native batch handoff and the sealed QA2 synthetic state/API fixture. During the qualification callback, it changes the durable acceptance criterion from “The current selection persists.” to “The current selection persists after a new independent server-side authorization check.” SHA, base SHA and request ID remain unchanged. Native claim reserves the revised subject. The exact inference prompt still contains the old specification and omits the new one. Native submit/reconcile then succeeds: `status=published`, one model invocation, one report comment, unchanged request `nonce-1`. The durable acceptance criterion is the new one. No genuine Claude inference or GitHub write occurred.

This is a frozen-specification binding failure. Postclaim semantic guards correctly reject such mutations during inference, but the same change between packet retrieval and claim bypasses them. Bind the expected semantic preclaim subject to the native claim operation, allowing the deliberate request-to-running/round reservation transitions and benign observations. Alternatively use an equally strong comparison between the prepared source identity and returned claim before inference. A changed specification must produce no inference or native report; preserve history and do not introduce refunds/replay. Add the preclaim race regression for both batch and standalone paths.

Evidence: `preclaim-binding-probe.mjs`, `preclaim-binding-probe.log` (exit 1 on the violated no-inference invariant). The last published source already had the narrow SHA/base/request join; the new semantic-binding acceptance requirement leaves this gap observable in the frozen candidate.

## Independently verified corrections

- F1 capacity: explicit `opus[1m]` probe, one unique resolved Opus model, positive integer context/output metadata, internal Haiku exclusion, context clamp to 1,000,000, and review invocation pinned to the resolved model with `[1m]`. Complete serialized prompt/schema UTF-8 bytes plus 65,536 overhead and observed output are counted before claim. Independent Unicode/JSON-escaping boundary test passes at exactly 1,000,000 and rejects one token above. Missing profiles and statically excessive packets spend zero claims. Existing suite covers queue continuation and bounded source retrieval. No paid token API was used.
- F2 after-claim behavior: independent real-native batch and standalone probes reject same-actor/same-SHA replacement claims for valid, timed-out and unsafe output. Full validated communication-sanitized reports and SHA256 of `JSON.stringify(report)` survive actual ownership changes and submit/post-then-error, reconciliation, projection and wake uncertainty. Benign check/observed-at changes permit valid publication and exact-owned failure while preserving observations/history. Invalid/secret raw output is not retained. Semantic request/claim/owner/base/ref/round/ledger/specification/source/active-implementation changes block native reports.
- F3: independently parsed workflow YAML grants only `contents: read`, installs from the isolated committed tools package/lock through `npm ci --prefix` before credentials enter the model step, pins trusted `main`, and preserves the disabled activation gate. Every CLI/platform package is version 2.1.301 with registry URL and SHA512 integrity. Root package-lock matches HEAD. The root's real clean-install qualification receipt matches the exact tools hashes, install/version exit zero and `2.1.301 (Claude Code)`, with no provider/GitHub credentials or calls. QA did not repeat installation.
- Unknown model execution outcomes retain the spent round and finite failure/recovery wake. No automatic inference replay, self-issued grant, claim reuse, array pop or refund was introduced. This complies with the explicit acceptance amendment; the rejected peer refund suggestion is not a defect.

## Recorded phases

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | Existing contract validates (`CONTRACT VALIDO`, contract.log); actual peer report and acceptance amendment read. AC1 frozen semantic binding is the failing criterion. |
| 1 Full source/diff review | FAIL | QA3-01. Exact 11 hashes reserved before review and unchanged afterward. |
| 2 Build/tests | FAIL | Focused: 126 PASS, zero fail/skip. Full requested suite once: 1,257 total, 1,254 PASS, zero FAIL, three skips. Independent 22 scenario groups PASS; separate preclaim semantic-binding probe FAILS. |
| 3 Scoped runtime evidence | PASS | Configuration/internal worker only; contract Frontend/UI=no, Playwright=no, parent expressly limits writes/probes and prohibits browsers. Real-native synthetic protocol/state assertions supplied. No application/UI/clinical surface was introduced. |
| 4 Security | FAIL | Frozen-specification authorization boundary QA3-01. Other reviewed boundaries pass: isolated OAuth-only child, no tools/MCP/settings/PR execution, bounded hash-verified data reads, sanitized receipts, trusted main, read-only job token and required locked CLI. |
| 5 Report/freeze | PASS | report.md, result.json, before/after hashes, STOP.json and seal.json. No source/contracts/old QA/canonical-state writes. |

Node: `/tmp/clinicos-node22-native12/node_modules/node/bin/node` (`v22.23.4`). Both suite commands use private `TMPDIR=.../cloud-qa3/test-tmp`:

1. `node --test agent-team/tests/bug-pipeline/cloud-review-worker.test.mjs agent-team/tests/bug-pipeline/comment-review-handoff.test.mjs agent-team/tests/bug-pipeline/standalone-review.test.mjs scripts/quality-gate/claude-bug-review.test.mjs` → focused-node22.log.
2. `node --test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs` → full-bug-pipeline-node22.log, executed once.

`git diff --check` passes. New independent probes import the preserved QA2 fixture modules without modifying them. Source-before/after also hash every prior QA1/QA2 file. Static workflow/lock verification is in `static-security-verification.json`.

## Operational qualification remains unverified

Actual hosted run `40202235777`: token present, `claude-authentication-error`, providerAuthenticated=false, zero issue claims and API fallback=false. Metadata-only format run `40208616713`: token present, unrecognized format, providerCalled=false. QA read both receipts and made no provider/authentication retry, state/API/Git mutation, installation, fetch or browser run. The new 1M profile has synthetic evidence only. Hosted native event/authentication, genuine cloud review and whole activation remain **UNVERIFIED**.

Final code decision: **FAILED VALIDATION**. This reservation is sealed and stopped for author correction and a new independent reservation.
