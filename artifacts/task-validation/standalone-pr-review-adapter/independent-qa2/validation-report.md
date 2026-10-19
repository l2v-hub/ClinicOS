# Independent QA2 — implementation cycle 2/4

**FAILED VALIDATION.** Reviewer `/root/standalone_adapter_independent_qa2` is independent of the implementation. Candidate baseline `d1324cb3`, branch `codex/standalone-pr-review`; thirteen frozen source/test/docs hashes match cycle2/source-freeze.json (`7451927efd684e6978b96299501e5b69b6160b605ecc4701dc4b6a7b8250a9a1`). Author report hash remains `2d908fa5480f472ca4defbce204a89a018ca029c2e948956b4a629f233847d10`. All fifty prior author/cycle2/QA1 proof files remain byte-identical. QA2 made no production-source changes, commits, pushes, GitHub/provider/model/DB mutations or live model calls. Root owns publication and controller state.

| Phase | Result | Independent evidence |
| --- | --- | --- |
| 0 Contract | PASS | Original and cycle2 contracts/analysis/plans, current source freeze, ClinicOS bug-delivery/qa-gate/agent-loop and evidence skills read; QA2 task-contract.md |
| 1 Full diff review | FAIL | F3 accepted multilingual report strands reservation; F4 enlarged accepted state cannot reload through real state adapter |
| 2 Types/build/regression | PASS, coverage gaps exposed separately | test-results/frontend-types.log; frontend-build.log (`tsc -b && vite build`, exit0); full-regression.log:659 tests,656PASS,0FAIL,3existing Windows SKIP;26additional boundary/revision/recovery checks PASS; adversarial F3/F4 reproductions below |
| 3 Playwright | PASS for recorded assertions; failing behavior independently reproduced | browser-result.json:10 actions plus reload; browser-counterexample.json proves accepted Unicode report and shorter replacement remain running;4PNG,2trace ZIP,2videos; zero console/page/relevant HTTP errors |
| 4 Security | PASS for examined credential/PHI/auth/source/merge safeguards; availability defects remain | media-security-validation.json; source-integrity.json; boundary-verification.json; revision-recovery-verification.json. Input/storage bound mismatch and state-reader availability defects prevent gate readiness |

## F3 — A submitted schema-valid multilingual report cannot be durably imported

Correctness/availability finding at `agent-team/src/bug-pipeline/standalone-review.mjs:68`. The stored-report cap uses128,000 UTF-8 bytes, while the existing review schema and60,000-character comment transport use character counts. A synthetic approved report with50,000 CJK characters has50,106 compact JSON characters and150,106 UTF-8 bytes. It passes the actual `validateReview`, passes production `submit`, and creates an authenticated50,373-character comment below the comment limit. Production `reconcilePR` then throws `Stored review exceeds bound` during durable-state validation, leaving the reserved review `running`.

Submitting a second short valid replacement report succeeds, but reconciliation encounters the first accepted report and throws again; the durable reservation remains running. This is a residual F1 stranding case, despite the repaired original ASCII14KB case. The same failure reproduces with actual committed PR393 and PR491 descriptors and Git blobs, using synthetic native identity/checks/authentication/CAS/transport. No real state was changed.

Evidence: `unicode-report-probe.mjs`, `test-results/unicode-report-verification.json`, `actual-git-unicode-probe.mjs`, `test-results/actual-git-unicode-verification.json`, `test-results/browser-counterexample.json`, `screenshots/04-valid-unicode-report-stranded.png`, `trace/counterexample-trace.zip`, `counterexample-video/`.

Required correction: use compatible schema/transport/storage bounds with adequate UTF-8 capacity or validate the same narrower bound before accepted publication. Preserve normal100KB guards, sanitize reports fully, retain budgets/claims, and ensure accepted/replacement reports cannot become permanently unimportable. Add actual import regressions for bounded multilingual content and subsequent reconciliation.

## F4 — Accepted accumulated standalone state becomes unreadable above1MiB

Correctness/availability finding at `agent-team/src/bug-pipeline/github.mjs:279` (existing state loader consumed by newly enlarged standalone state). GitHub Contents can return a regular-file response with `encoding:"none"` and empty content for files above1MiB. `createStateStore.load` always decodes `content` as base64 and parses it, with no bounded Git-blob fallback.

QA2 constructed three individually schema-valid standalone subjects, each retaining four valid92,506-character ASCII reports. The complete state is1,124,638 UTF-8 bytes and passes actual `validateStandaloneState`; no Unicode/storage-bound fix is needed to reach this case. The production state reader receives size/type/blobSHA metadata and an available matching base64 Git blob from a read-only fixture. It performs only branch-ref and Contents GETs, never requests the blob, and fails `GitHub returned invalid JSON for durable state`. Future trusted CLI/pipeline operations cannot reload that accepted state.

Evidence: `durable-state-probe.mjs`, `test-results/durable-state-verification.json`. This is a GitHub API semantics fixture, not a live large-state API experiment. Root specifically requested this additional reproduction before source edits.

Required correction: introduce bounded durable-state reads/writes and authenticated size/type/encoding/blob validation; fetch the matching Git blob when Contents omits content, while preserving the original Contents blobSHA for CAS. Reject oversized or inconsistent payloads without resetting durable state. Add real state-adapter coverage for large load/save/reload and CAS guards.

## Repaired original counterexamples and privileged boundaries

The original F1 ASCII report case now passes: actual393 imports a15,476-character report into106,721-character subject and validates four reports at460,548 characters. Actual491 imports the same report at28,918 characters and four reports at382,745. All18/12 selected packet hashes and complete430/47 merge-base/head deltas were validated through actual local Git trees/blobs and production `readFileAtRevision` bounds. Normal `safeText` still rejects100,001 characters. These repaired cases do not supersede F3.

F2 now rejects rewritten prior-attempt copies, changed/deleted prior packet bytes, and reused packet paths. A third revision retains both prior packets at original paths; tampering either older packet fails before a durable save. Attempts remain3/4 and old proof digests match. Evidence: boundary-verification.json and revision-recovery-verification.json.

Production CLI and runtime source use the same frozen fixed16 infrastructure policy. Independent fixtures exercise success, retained releaseHold, application/unknown paths, absent Claude, missing/blocked Codex callback, failed native checks and authorization loss; forbidden merges remain zero. CAS merge reservation exists before side effects. A lost merge response, subsequent auth loss and restored auth recover only the exactSHA receipt with one synthetic merge and one synthetic QA callback. A second terminal tick does neither again. Normal/unadopted finalize is rejected. Authenticated native main advance is accepted only with unchanged frozen merge-base; changed head/fork/baseRef/merge-base reject. Source review and existing regression also cover the actual protected `--match-head-commit` adapter and detached clean checkout, model read-only sandbox/prompt and separated credentials. No application code/tests/package installation was executed by the read-only standalone reviewer; QA2 independently executed infrastructure tests and the mandated frontend type/build gate in this cloud checkout.

## Browser, media, integrity and limits

The QA-owned loopback surfaces drive actual production orchestration modules with explicitly synthetic GitHub/checks/CAS and declared synthetic QA callbacks. They prove protocol values, durable ownership/labels, reload persistence, held application no-merge, fixed-policy infrastructure receipt/idempotency, and the F3 failing result. They do not prove actual Claude Max, hosted checks/merge, model inference, provider readiness or deployment. The2.6s success video and counterexample video decode; all four PNG decode and the final protocol/counterexample result text was visually checked; both traces pass CRC/member/credential scan. The HTML protocol report is QA-generated, not a native Playwright test-runner report. Browser runs held `/tmp/clinicos-browser-qa.lock`; only QA2-owned loopback servers/browsers were stopped. Existing app servers were untouched.

The first custom boundary script had a QA-only syntax error before execution; its log is preserved as `test-results/boundary-first-fixture-syntax.log`. The script was corrected, then22boundary checks and4deeper revision/recovery checks passed. No candidate source was repaired.

`test-results/external-root-live-readonly-receipt.json` is copied external evidence owned by root:82live read-only GitHub operations at2026-10-17T16:55:05Z, native393/491 packet/identity/check verification PASS, zero writes/models/provider calls. QA2 did not independently repeat those live operations. QA2's actual-Git probes mock native PR/check/auth/transport. Root's separate actual Codex CLI smoke failed before model initialization on managed read-only configuration. Actual authenticated-PC finalize and genuine Claude/independent model approval remain unproven; no failed/running ownership has been erased or relabeled verified.

Candidate is not trusted/main/live or released. App393 must retain its release hold and cannot merge through this infrastructure boundary. Fix F3/F4 within the existing implementation budget, preserve every author/QA1/QA2 artifact, freeze the corrected candidate, and obtain fresh independent QA plus genuine external review before publication.

## Final Decision

**FAILED VALIDATION**
