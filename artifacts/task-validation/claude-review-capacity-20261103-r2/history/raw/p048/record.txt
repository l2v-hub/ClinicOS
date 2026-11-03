# Independent test-only delta QA — scoped pass at 21cbfa5b

Reviewer: actual independent agent `/root/auth_expiry_final_qa`.
Source: `21cbfa5b90dcde75b076521278d1f1c6a95bbc08`.
Tree: `bf59a79e0c7a50566bcc37fbcb783bd51f4c3ebe`.
Index digest: `c2ef0726ccc0570c0e12cb4d6232110db5de58dc300aa81ed723101c07020e53`.

## Conclusion

PASS for this offline test-only delta and source-bound regression replay; findings none. Prior independent5139 runtime/code QA carries forward through exact byte parity, not assumption. This is before-own-Max evidence, not post-Claude/final approval, current Linux CI proof, authentic native qualification, release authority or demo restoration.

Root sequentially reassigned the completed idle QA checkout to this frozen source. Before/after HEAD, index and tracked/untracked status are clean and stable. Only `agent-team/tests/bug-pipeline/native-guard-container.test.mjs` differs from5139. Every runtime, protocol, session, worker, workflow, documentation and application blob is identical to the previously reviewed source. The complete46-path changed manifest against D2 is bound by Git blob/SHA-256/size; local files are byte-compared and sparse historical artifacts are explicitly Git-only.

## Inspected change and regression proof

Read the complete single-file diff, author report, retained author red/green logs and receipts, and supplied older CI failure summary. The bug was in observation ordering: counters were sampled after detached launch and Docker inspection, allowing a fast positive fixture to increment both counters before the baseline snapshot. This made a real successful positive control fail its growth assertion.

The test-local observeProbeLaunch helper now calls readCounters synchronously before invoking launch, then returns that snapshot with the eventual launch ID. The real Linux test uses this helper for each mode; the old late snapshot is removed. Fixed image, observed gateway, exact target and fixture-hash equality, positive TCP/DNS reachability, positive host-counter growth, network:none counter equality, Unix/loopback checks and cleanup assertions remain intact. No retry, weaker threshold, waived assertion or isolation-policy change was introduced. `git diff --check` passes.

Independently extracted the exact original helper and immediate-completion regression intact from immutable integrated red commit `c44250e54d61789597dbca9424f9a51eb718590a`, prepending only built-in test/assert imports in a private file. That red test blob is byte-equal to the author's preserved red `2ce475d445fded2a4e144370ef2be7fd18dd27e7`. The author green test blob atbd363cce is byte-equal to current21cb. No red assertions were rewritten.

Actual independent red replay fails exactly as required: before counters are1/1 versus expected0/0. This is expected historical regression evidence, not a current candidate failure. The same immediate-completion regression genuinely passes in the current source's complete eighteen-suite run. Author red receipt records its prior HEAD plus changed source, not an immutable clean red execution; the separate immutable extraction provides the independently source-bound red comparison. All original failures remain retained.

## Actual independent runs at current source

- `all-proper-eighteen`: 175 tests, 172 PASS, 3 explicit Linux SKIP, zero failures/cancellations. Every exact requested suite file exists and is listed individually in its receipt.
- `unchanged-private-reproofs`: 46/46 PASS, zero failure/skip/cancellation. This retains all previous policy/liveness/timeout/optional-wrapper/metadata/argv/certificate assertions unchanged, including the previously failing nested policy and liveness interleavings. Only assigned SHA/private output paths changed; original per-runtime isLive fixture remains correct.
- `immutable-red-counter-order`: expected exit1, one intentionally failing historical helper/regression case, zero skips/cancellations. Its receipt records the current clean harness checkout; its separately hashed/extracted tested code originates from immutablec442, not current21cb.

All executions use trusted D2 createRunner in credential-stripped verification mode, with exact HEAD/index before/after and actual log/receipt hashes. Commands, times, transformations, source manifests and retained author evidence hashes are in execution-evidence.json. The new expected-red assertion is not counted as a candidate failure or disguised as a pass.

## Limits and pending gates

Parent-supplied source2-repair-ci-failures.json preserves older Linux run41670288154 at4c8: 2012 tests, 2008 pass, one counter-order failure and three skips. Author/parent report OpenSSL FIFO and real TLS passed there; the supplied JSON contains the sole failed-test context. This reviewer did not retrieve GitHub or run Docker/OpenSSL; reported older cloud evidence is hashed as such, not independently refetched or relabeled as current21cb all-green. The counter-order change specifically requires actual final-head Linux CI confirmation.

Current Windows execution still explicitly skips real OpenSSL-chain, Unix CONNECT/TLS and controlled Docker escape cases. Their absence is not converted into qualification. The prior scoped code pass, finite packet/context accounting, complete mandatory context, no-tools/native OAuth route, one-shot owned-claim fences and synchronous final policy/liveness/deadline checks are carried through exact unchanged source blobs. Retained Windows full-controller baseline/candidate failures are not claimed green or newly rerun here.

No real provider, native Claude, OAuth/credential access, Docker/OpenSSL, GitHub/controller/canonical mutation, source edit, main-worktree write, commit/push/merge/deploy, production action, clinical access or issue closure occurred. All generated evidence is private under independent-native-combined4. Old reports/receipts and all implementation/review history remain unchanged; no budget or app-source allowance changed.

This pass is offline QA evidence only. Parent must bind the later frozen packet/final subject and exact real CI, obtain genuine old-worker Max review and subsequent independent post-Claude final QA, then satisfy protected release/native qualification and actual online gates. It does not authorize automatic merge/deploy or claim demo authentication restored. No final-qa-agent-result approval is emitted.
