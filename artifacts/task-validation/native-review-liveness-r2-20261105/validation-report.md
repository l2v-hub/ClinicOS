# Validation Report

Tested code: **bdb1877976ee2524d78cf8c71072731bd87f8849**. Parent:65ab406e08327c21d669f2d6ba3e5a871b3459ec. Evidence commits add only this packet. Original code and the complete changes-requested Max advisory are preserved.

| Criterion | Result | Evidence and limits |
|---|---|---|
| AC1 key disposal and independent stop | PASS with fakes | Disposal occurs before async waits; resource stop attempts remain independent; directory stays on unknown failure. New tests cover rejection/hang/success. No real Linux factory/key or Docker run. |
| AC2 cleanup owns pending startup | PASS locally | Child tests cover permanent startup wait and late successful/rejecting/hung close, exact-once close, explicit cleanup failure and zero forwards. Existing cancellation/capacity/one-forward tests pass. |
| AC3 structured failure classification | PASS with fakes and real CLI child | Staging, claim failure and reserved transition preserve evidence; bootstrap emits finite unknown receipt with exit1, no retry. The new CLI test failed before the correction (empty stdout) and passed after. No actual cloud reservation was created. |
| AC4 regression and integrity | PASS locally; hosted pending | Integration suite189 tests:186 pass,3 Linux-specific skips,0 fail. Author suite188:185 pass,3 skips. Syntax, Prettier and diff checks pass. See test-results/integration-native-worker.tap. |
| AC5 history, scope and truthful gates | PASS | Immutable prior report/receipts and local source history included. No native529 subject/round assigned, allowance added or old history reset. One permanent development remains the target; future production deferred. |

Independent reviewer infra_inventory examined the stable author patch and ran its focused subset143 tests:140 pass,3 Linux-specific skips,0 fail. It found no additional confirmed functional defect. It separately reviewed the root CLI increment without redundant test execution, confirming worker-failed is not a successful/native approval status. The receipt's unknown fields require strict ===true tests by future consumers; current artifact workflow only stores them and does not promote anything.

The original extra Max advisory invocation remains consumed1/1 and is not refunded by these corrections. Further source reviews require their own actual authorization/budget reconciliation; no such inference or approval is fabricated in this report. Local source revisions are not canonical native implementation rounds.

Hosted Linux CI, actual source-bound guarded Docker/Max qualification, post-Claude QA and actual independent native human approval remain outstanding. docs/claude-local-review-prompt.md:53 still requires the protected human path for these trust-root changes. Failed run41937588247 remains inference-UNKNOWN; it was not redispatched.

Development is still not deployed or parity-verified. Separate offline ledger/provider adapters remain preparation only; this report is not an application environment receipt. Current demo and aliases remain untouched; no new production environment, cloning, seed, cleanup SQL or clinical data access.

Final Decision: IMPLEMENTED — NOT VERIFIED
