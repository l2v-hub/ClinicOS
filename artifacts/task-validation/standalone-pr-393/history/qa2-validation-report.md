# Fresh independent QA2 — PR #393 reconciliation

**Final Decision: READY FOR CODEX QA**

17 October2026, dedicated fresh QA session independent of implementation/co-ordination.
Candidate `codex/reconcile-pr-393`, baseline main `299ba8ff8d048631cdb969f26656d02de981da83`,
author cycle2/4. Frozen candidate source-manifest SHA256
`531df2a105702b926f92514f6d14e6a74b50c7f6a28434ad276a2e78e6ba6c00`.
All25 source files,3 original contracts and2 cycle2 supplements match before/after.
All106 first-QA sealed artifacts plus its seal remain byte-identical. Its real
FAILED VALIDATION result remains historical; no prior failure is rewritten.
No product/contract changes, commit/push, GitHub mutation, provider/model call or activation by QA.

| Mandatory phase | Result | Concrete evidence |
| --- | --- | --- |
|0 Contract | PASS | Own `task-contract.md`, parent AC1–AC7/analysis/plan and bounded cycle2 supplement; actual original livePR body/comments/reviews read and safe snapshot in `test-results/live-pr393.json`. Historical Azure-default/deployment-missing claims do not describe current source. |
|1 Full diff | PASS, no open finding | `diff-security-review.md`, tracked full diff and nine new executable/doc/test paths in `test-results/full-diff-scope.json`. Two changed paths relativeQA1 only: hook lifecycle fix and browser regression. |
|2 Independent build/tests | PASS | Fresh frontend1386/1386 PASS,0FAIL/skip; production frontend build741modules PASS; backend tsc zero errors. Each of three isolated executions independently runs12/12 focused backend cases. Python240+6 ASGI/config probes **inherited**, not rerun, after exact106 unchanged tracked inputs and frozen runtime/backend source verification. |
|3 Actual Playwright | PASS | Own expanded runtime52/52 real browser assertions; separate old failing probe4/4 PASS, repeated as fresh probe2 only for provenance correction. All own stacks clean. Full run has0 unexpected console/page/HTTP errors; controlled provider503 tracked separately. |
|4 Security/media/privacy | PASS | DefaultOFF/provider/authorization/byte/response bounds and server-only secrets reviewed. `privacy-media-validation.json`:24PNG,732embeddedimages decoded,3fullvideos decoded,3ZIP CRC valid,0credential pattern findings. Synthetic data and uniquely owned PostgreSQL only; no5432/Railway/production/provider use. |

## Acceptance and regression

- AC1/AC2 PASS locally: current and legacy file STT/model selection preserved; default realtimeOFF, explicit flag/model/registry dispatch and unsupported/off denial with no silent fallback. Byte-identical baseline file-STT and frozen runtime inputs are recorded in `inherited-proof-identity.json`. Status is configuration only.
- AC3 PASS locally: existing backend identity/voice.plan/channel/rate limiter precede SDP buffer/provider access; real owned-PG negatives rerun. Inherited unchanged ASGI probes establish streamed auth/body/malformed/Unicode bounds. SDP64KB, JSON body+4096 bound,96KB responses, fixed public errors, server-only grant/key and refused credential redirects remain.
- AC4 PASS: all four early codes/states now reach ERROR with peerclosed, tracksended, retry and textfallback; no submission/upload/write. Actual committed-empty reachesIDLE/no invented transcript, then a new capture works. Cancel/late or denied permission/disconnect/residentchange/hidden/unmount and old AudioContext rejection/new pendingpermission race pass.
- AC5 PASS: exact partial display-only/no submit; premature final while listening and synchronously before actual250ms commit ignored; stale partial/final/error after cancel/residentchange ignored. Only actual committed final may be edited/sent; existing policy preview and separate explicit confirmation precede exactly one120/80 write. Actual reload/reauth authorized readback visibly retains120/80 with no second write.
- AC6 PASS for local source: fresh independent regression/build/actual app/browser/ownedDB and audited screenshot/video/trace bundles. Scripts use real Playwright API; generated HTML report is accurately labelled, not a claimed native Playwright Test-runner result.
- AC7 boundary PASS: actual Azure positive transcription and real RTCPeerConnection/provider compatibility **NOT RUN**, not PASS. No deploy/provisioning/environment activation. This certifies optional implementation under the approved source contract, not real-provider readiness or release.

## Evidence to inspect

Normal52-case flow: `runtime-1/test-results/integrated-result.json`,
`runtime-1/screenshots/01-partial-display-only.png`,
`02b-independent-early-final-rejected.png`, `04-confirmed-one-write.png`,
all four `13-early-*.png`, `14-empty-committed-idle.png`,
`15-retry-after-buffer-errors.png`, and `12-reload-persisted-readback.png`.
Screenshots here are under `runtime-1/screenshots/`; final12 visibly shows the actual120/80
readback after reload. Full video in `runtime-1/video/`, complete trace in
`runtime-1/trace/trace.zip`, generated index `playwright-report/index.html`.
Manual inspection independently confirms recoverable ERROR/textfallback, committed-empty
Microfono spento, and actual visible persisted120/80.

Original failing probe: `early-buffer-probe2/test-results/early-buffer-observed.json` is
`ERROR`, peerclosed=true, allTracksStopped=true, commits=0, partial=null, sendcontrols=0,
assistantrequests=0. Its screenshot `early-buffer-probe2/screenshots/independent-early-empty-buffer-error.png`,
full video and trace are final authoritative regression evidence with true pristine digest receipt.
Original terminal-state assertion is unchanged; only optional observation of the now-absent partial
element was adapted. First rerun under `early-buffer-probe/` remains preserved. Probe checks overlap
normal assertions; do not sum them as56 distinct ACs or backend repetitions as36 distinct tests.

## Audit correction and immutable history

The first inherited verifier failed public25MiB file size on a27,106,574-byte full trace.
Its tool failure is retained in `logs/first-verifier-failure.txt`. It had already sanitized the
first short probe without writing its in-memory prehash receipt; that limitation is disclosed
in `privacy-provenance-note.md`, never invented. Fresh short probe2 supplies pristine auditable
provenance; no product or test assertions changed to make a failure pass.

The full trace was pristine at the size failure. Lossless normalization deduplicated190
byte-identical JPEG resource copies, changing only frame resource references, while retaining
all2090events,623frames, times/order/DOM/network/assertions and identical decoded frame payloads.
The resulting17,746,587-byte trace is below25MiB; receipt `trace-lossless-normalization.json`
binds original/final archive digests and complete path/hash mapping. Pristine original archive
is retained privately for publisher verification at
`/workspace/.clinicos-cloud/voice393-qa2-pristine/runtime-1-trace.zip`; it is not a public artifact.
The normal trace then underwent transient synthetic-session/DSN sanitation with exact before/after
ZIP/member receipts. Member resource names remain identifiers, not claims of unchanged payload hashes.
`pre-sanitize-manifest.json` independently agrees with every final sanitizer beforehash.
All remaining embedded image resources decode; all623 final frame references resolve.
Own verifier now preflights every file before writes and checkpoints each transformation.

## Commands actually executed

```bash
npm --prefix frontend test
npm --prefix frontend run build
backend/node_modules/.bin/tsc -p backend/tsconfig.json --noEmit
flock /tmp/clinicos-browser-qa.lock node artifacts/task-validation/voice-pr-393/independent-qa2/independent-runner.mjs --out artifacts/task-validation/voice-pr-393/independent-qa2/runtime-1
flock /tmp/clinicos-browser-qa.lock node artifacts/task-validation/voice-pr-393/independent-qa2/early-buffer-runner.mjs --out artifacts/task-validation/voice-pr-393/independent-qa2/early-buffer-probe
flock /tmp/clinicos-browser-qa.lock node artifacts/task-validation/voice-pr-393/independent-qa2/early-buffer-runner.mjs --out artifacts/task-validation/voice-pr-393/independent-qa2/early-buffer-probe2
node scripts/quality-gate/validate-task-contract.js voice-pr-393
git diff --check
/opt/codex/runtimes/codex-primary-runtime/dependencies/python/bin/python artifacts/task-validation/voice-pr-393/independent-qa2/verify_artifacts.py
```

Logs under `logs/`; each owned run has actual backend/migration/seed/server logs and machine
ownership/cleanup receipts. Python240+6 evidence is inherited explicitly from QA1, not in the
executed command list. No skipped selected tests, no timeout/expectation weakening, no real provider call.

## Handoff

Root remains sole publisher/gatekeeper. Rewrite originalPR title/body to final opt-in
provider-neutral implementation; bind actual publishedSHA, required native checks and currentSHA
Claude/Codex review before eligible merge. Current gate does not establish future integrated-main
checks, Claude approval, deployed targetSHA, realAzure readiness or issue closure.

**Codex must now re-run the QA Gate.**
