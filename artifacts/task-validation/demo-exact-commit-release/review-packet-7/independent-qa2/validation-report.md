# Independent QA2 — isolated native exact-commit demo release

Independent source QA: PASS

Verdict: READY FOR CODEX QA

Final Decision: IMPLEMENTED — NOT VERIFIED

The final decision records the remaining actual review, protected-main and provider/live release gates; this packet certifies the bounded source/fixture QA only. No deployment or provider authorization is certified.

Source: `bb196b215cadce3ad0594dc3c06bc6d36e32c26f`; first-main-merge base: `45033a3949742218b1c9d23a37a0c94776cd5bd5`. Reservation `f73892e7-0594-4c0c-87cd-3e4c738674fd` was read before a fresh private contract, contract validation, source freeze, tests and private harness. The QA2 session is independent of author1/author2 and root coordination. Author claims were read and independently verified. Source edits, provider actions, credential discovery, Git/GitHub writes and root state writes were prohibited and were not performed.

## Findings

No remaining source correctness/security blocker found within the approved scope. QA1 F1 is addressed: the old workflow is restored to the full original bytes, and native-exact-commit-v1 is exclusive to a new manual demo-only workflow. Its successful receipt no longer depends on a legacy sibling job or another old workflow run.

The original QA1 FAILED VALIDATION remains an immutable historical result against `630bef997a53a2d335b1f4a775151a7e8c604d81`; QA2 does not rewrite or turn that earlier candidate into a pass.

## Contract and scope evidence

- The repository validator returned CONTRACT VALIDO for this QA2 task-contract.md before tests/harness creation.
- All author2 source hashes and immutable imported helper hash matched source-manifest.json independently.
- The four authorized round2 source paths were frozen: old workflow, new manual workflow, demo module and test. The old workflow restoration has no net diff against 45033. All 111 source/test/workflow/import snapshots use distinct inodes and match their before hashes after QA.
- Full old workflow SHA256: `6743d823679a9c1076c85dfcb5e5b9a8f96705849123b3091cac5d00cadaa3f9`, byte-identical to 45033. Main verifier helper SHA256: `c674e302471ea8b95154aa7e440761d0ca188475bdaffd294e9f4d3ad9c4536a`, unchanged.
- The 7,243 tracked proof Git entries, sparse presence and present-file hashes are unchanged, including author1 and author2. All 273 files in the private QA1 packet are unchanged, including its failed report SHA256 `221e1e8fc8c28faf1fd04bd5cd2ba48b6801ce8caae52312b6542da5c41b9468`.
- HEAD and empty Git status remain unchanged. No historical proof archives were duplicated. source-before.json/source-after.json contain the complete preservation evidence.

## Independent runtime tests

| Check | Actual result | Evidence |
| --- | --- | --- |
| Focused command in new manual workflow | 187 total, 187 PASS, 0 fail/skip | focused-attempt-1.log/json |
| Full bug-pipeline workflow unit-test step | 762 total, 759 PASS, 0 fail, 3 native Windows skips | full-workflow-attempt-1.log/json |
| Private actual CLI subprocess fixtures | 58 PASS | independent-qa.mjs, cli-attempts/, independent-results.json |
| Real immutable ZIP reader release verification | 14 PASS | independent-qa.mjs, independent-results.json |
| Unknown selected policy before any access | 1 PASS | independent-results.json |
| Real immutable ZIP reader preflight discovery | 12 PASS | independent-discovery.mjs, independent-discovery-results.json |
| Native active identity and byte-bound checks | 10 PASS | independent-extra.mjs, independent-extra-results.json |
| Parsed workflow, exact legacy bytes, actual net-path trigger review | PASS | workflow-review.json |

Fresh commands ran on Node v24.19.0 with minimal environment and no inherited provider bindings:

- `node --test agent-team/tests/bug-pipeline/demo-deployment.test.mjs`
- `node --test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs`
- `node /workspace/.clinicos-cloud/demo-exact-release-independent-qa2-20261019/independent-qa.mjs`
- `node /workspace/.clinicos-cloud/demo-exact-release-independent-qa2-20261019/independent-discovery.mjs`
- `node /workspace/.clinicos-cloud/demo-exact-release-independent-qa2-20261019/independent-extra.mjs`

The full workflow claim is limited to its actual specified unit-test command. Hosted tool installation, isolated sandbox/services and native Windows workflow execution are not claimed. Native Windows scheduler/ACL/bootstrap checks are the three recorded skips.

One private discovery harness construction attempt failed before reaching the production verifier: I incorrectly assumed ZIP filenames demo-deployment-receipt.json and demo-preflight-receipt.json had equal lengths (28 versus 27). The raw failure and attempt1 harness are retained. The corrected attempt builds the proper preflight filename directly in the ZIP entries and passed 12 checks. This was a private fixture defect, not a source failure; attempt-history.json records both. The focused and full source suites each passed their first QA2 attempt. Other private harness checks passed their first attempts.

The QA2 fixture framework reuses reviewed QA1 fixture utilities in a NEW private packet, adapts the trusted producer path/event and main verifier responses, and adds new tests. QA1 files were never modified. All CLI cases execute the actual frozen source in a child Node process. Fetch is replaced only in the private child import; every accepted URL and header is asserted and no fallback network path exists. All Web Responses, tokens, deployment IDs and SHA values are synthetic. Each case retains stdout, stderr, request sequence and fixture. Positive on-disk receipts require mode 0600, exact policy and the immutable SHA; negative cases require no deployment receipt.

## Acceptance coverage

Freshness: successful deploy CLI request order is main → target → main → sole mutation → native → ready → native → main. A stale queued SHA, including a later run attempt, is rejected before any provider request. Advancing main during target preflight produces main → target → main and zero mutations. Advancing main after readiness performs the final native and main reads but issues no receipt after exactly one mutation. Missing/wrong/newline reviewed SHA, missing GitHub token, unavailable/oversized/redirected/timeout main response, wrong ref/type and noncanonical returned SHA reject. GitHub requests use only the synthetic read-only GitHub token at the exact fixed Git ref endpoint with no-store/no-cache; Railway receives only its synthetic project-token header. No token is forwarded across those origins.

Policy/workflow: exact operations require only the fixed new main manual workflow. Exact in the old path, strict in the new path, exact push events, arbitrary workflow paths and invalid Actions/main/repository/run context reject before provider mutation. Missing policy retains strict historical semantics. Actual immutable createProofReader downloads digest-bound ZIPs, extracts real JSON, validates receipt source policy, proper workflow/event, run/attempt/source/target/reviewedSHA, and uses that bound policy for both native inspections. Valid strict old receipts remain independently verifiable against the single-main-trigger inventory; the same legacy receipts cannot authorize zero triggers. Exact receipts in old workflows, legacy receipts in new workflows, unknown policy, expected-policy mismatch and missing/wrong reviewedSha reject before native reads. A separate failed legacy run is never queried or required by new exact proof; failure of the selected new run still rejects.

Preflight discovery: real ZIP reader fixtures verify default exact-first discovery, fallback to strict historical workflow, explicit strict/exact selection and signed-storage credential isolation. Cross-path/policy/event receipts, unknown receipt policy, wrong reviewed SHA, archive digest corruption and artifact source SHA mismatch reject. Discovery uses only the selected policy's fixed workflow route. Successful exact discovery does not query the old workflow; strict fallback does.

Topology and native proof: default strict zero-trigger rejection remains; explicit exact mode requires complete trigger pagination, both domain lists, fixed source/repository/project-token/environment/service/domain, and rejects foreign branch/repository/project triggers, duplicates and null edges. Native commitHash rather than message, all deployment target IDs, SUCCESS and one unique active deployment remain mandatory. Persistently stale or duplicate SUCCESS identities time out with one mutation and zero readiness reads. Wrong readiness routing and post-ready source/active drift reject. Denial, uncertain mutation transport, invalid returned identity and polling failure issue no second mutation. No new source-connect, trigger write, latestCommit or legacy upload execution was introduced.

## Workflow and first-merge review

The actual YAML was parsed independently with PyYAML BaseLoader, in addition to reading all changed code. The new workflow has only workflow_dispatch, required reviewed_sha, default read-only operation, one fixed-repository/main/manual demo job, immutable github.sha checkout with credentials not persisted, SHA-pinned actions, contents: read, fixed demo environment and one step bearing the dedicated demo secret. Credential-free module tests and reviewed/input/context equality assertions precede that step. It invokes preflight-exact before optional deploy-exact; normal Actions shell failure handling stops deployment after a failed preflight. The exact producer then independently validates current main before provider inspection and immediately before mutation; the earlier shell assertion is not the freshness boundary.

The entire legacy deploy-backend.yml is exactly the original base. Its unchanged production and strict demo jobs remain historical behavior. Both workflow files use group railway-backend with cancel-in-progress false; therefore there are no old/new simultaneous workflow runs in that group. Siblings inside the old workflow remain unchanged, but the new exact workflow has no sibling legacy writer.

All 11 ACTUAL net changed paths against 45033 were compared to EVERY old workflow push path filter. None match. Consequently this bounded infrastructure merge does not trigger that legacy deployment workflow; the new workflow has no push trigger. This conclusion is about the frozen diff and must be recalculated if later changes expand it. The module still imports only the unchanged createMainVerifier function from the historical configure helper; its other provider configuration exports are not invoked by this path.

## Security and practical limits

No clinical/UI/schema/auth route, dependency or PHI change; no real patient or credential values in fixtures. CLI denial/transport sentinel contents and synthetic token values are absent from stdout/stderr. All production request destinations are fixed. Main verifier reads are bounded to 256KiB; Railway and artifact streams to 1MiB, readiness to 16KiB. Exact main checks and provider errors are reduced to safe constant CLI diagnostics. Tests exercise those byte limits with actual Web Response streams and assert AbortSignal and redirect options. No full-duration timeout or live external egress test is claimed. ZIP parsing, digest checks, narrow signed-storage allowlist and withholding GitHub Authorization from signed-storage downloads remain in use.

The helper and new producer fail closed on stale/unavailable main, but current-main reads are snapshots, not an atomic branch lock with the subsequent Railway mutation. A branch move after the final pre-mutation check can still cause that exact older SHA to be submitted once; the post-ready main check then withholds receipt if the move persists. A later change after the final check, a move away and back between checks, or future provider writers cannot be ruled out by these reads. The remaining protection is explicit reviewed SHA selection plus independent native/live proof and controlled dispatch.

Shared workflow concurrency is not FIFO, may replace pending runs, and cannot prevent a future old backend workflow after exact proof. Root must drain every old running AND pending writer before first manual dispatch, and retain fresh native/live checks before relying on a receipt. The repository RAILWAY_TOKEN effective target remains unproven; isolation avoids needing to infer it. No claim that it targets either the demo or a different environment is made.

Inherited limitations remain: per-request deadlines rather than one total polling deadline; slow repeated requests may hit the external 40-minute workflow cap. Fixed first-page proof search windows can reject proof outside their search range, fail-closed. Finite post-ready reinspection cannot prove permanent routing stability. Hosted Node22, native Windows, provider project-token mutation permission, GitHub source-fetch integration, native exact mutation acceptance and real deployment/readiness are not established by synthetic responses. Official schema research was read locally; zero actual provider/API actions occurred.

## Remaining authorized gates and STOP

Fresh actual Claude review, fresh final Codex review, six required native checks and ordinary protected main merge remain necessary before actual provider action. After root drains old writers, the new manual workflow must be explicitly dispatched for the reviewed current main SHA, and actual native metadata, unique active deployment, uncached ready identity and post-ready native inspection independently verified. A denied or uncertain native mutation must retain its history and not be blindly retried.

No clinical UI is changed. Lead expressly authorized module CLI/HTTP fixture QA without clinical runtime; no browser, global clinical lock, shared clinical ports, screenshot/video or preview was used. media-manifest.json records that scope. Final source/preservation checks passed; disk free was 1,904,513,024 bytes, above the 1GB stop floor. No reusable environment configuration changes were needed or saved. This QA2 session is STOPPED after report/seal; root alone selects safe public evidence and handles further review/state/provider actions.
