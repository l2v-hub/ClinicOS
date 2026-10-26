# Analysis — source revision 4

PR514 source-only immutable candidate 88b9a33d4a879b85bbf8b543fd474b390461d304, parent 895e6bd54461fcc6a00be4117e4792bde6fc4e07, trusted current main 995e2ff6d14a96b5d67e0d14d708f4a95c4c816f. This revision retains all six independently tested source3 runtime files byte for byte, and adds nine source/test/documentation files to correct a proven Claude generation-contract failure and retain canonical recovery authorization history.

Actual instrumented native review4 request c7fe6290-344d-430d-a4a6-5648b245950e, claim64d19ebb-d082-4cb2-bf2f-873b76a6ffec, run40279159071 completed CLI exit0; its typed envelope and schema were accepted. The report said verdict approved with THREE findings. Unchanged strict native semantic validation correctly rejected this contradiction. It is NOT an approval; finding text from that rejected report was not retained. Earlier failed reviews2/3 exact rejection causes remain unknown. The original clinical run40249337703 exact execution failure and lost ephemeral outputs also remain unknown.

The generation instructions now state the existing native semantics explicitly for local and hosted Claude: approve only with zero findings AND adequate acceptance evidence; any finding, including LOW, forbids approval. Changes-requested requires one or more findings. BLOCKED is allowed with zero findings when context or evidence is insufficient. Empty findings do not force approval. Never hide, suppress, downgrade or discard findings to manufacture approval. Supported schema hygiene describes nonempty trimmed fields, bounded findings, tracked relative locations and safe text. Strict validateReview remains unchanged and every actual result/error is returned unchanged.

Permanent finite diagnostic metadata distinguishes stages using only bounded categories, typed booleans, counters, exit code and hashes of SANITIZED CAPTURED runner output. No raw provider report, stderr, key, token or patient data is emitted; optional diagnostic callbacks cannot replace native outcomes or mask errors. Actual CLI Responses inference40251755127 passed on the effective configured executor; metadata GET/models and doctor are insufficient inference evidence. No new credentials, billing changes or Anthropic API were used.

A separate proven native revision-adoption omission dropped reviewHandoffHistory even while Git retained old snapshots. The one production field addition now preserves that canonical journal byte for byte, including the distinct genuinely consumed host grant nonces. The native RED/GREEN fixture covers two failed handoffs, actual recovery history and no budget refund or new authority. Until this reviewed source reaches main, the controlled store transport for adoption restores ONLY the old reviewHandoffHistory field into the native proposed subject; all other native predicates, state images, validators and CAS remain unchanged. No fabricated GHA user-session grant is introduced.

Author4 final native command reports 1689 total, 1686 PASS, zero FAIL and three Windows-only skips; focused history amendment130/130. Initial incomplete fixture-context failures, the pre-amendment candidate and every previous QA/source/review attempt remain preserved. A fresh independent QA must bind all15 source pairs below before this candidate is published. Current-head CI and peer/final gates follow publication as sequential stages; they are never invented inside this pre-publication immutable packet.

## Complete source projection against trusted main

The later metadata-only head MUST retain all15 exact Git blob SHA1 and raw-byte SHA256 pairs from code 88b9a33d4a879b85bbf8b543fd474b390461d304; native verification and a plain authenticated exact-head proof comment will establish this before the next genuine peer request.

| File | Git blob SHA1 | Raw SHA256 |
|---|---|---|
| agent-team/src/bug-pipeline/cli.mjs | `b42cd83de4b6442451a7437926271e70b761b712` | `a34f3009edd29bd0b0e5e2f5a707fd80aaf7c1063be7bd4e68e32b7e162b93ed` |
| agent-team/src/bug-pipeline/cloud-review-worker.mjs | `3ab67169e44fa898f1b2f3fe8269907bb62bd8ae` | `b9bb543eb127e35c7e123af83e0ffda2c934bfc9c2cefafe82f9edd0a145f22b` |
| agent-team/src/bug-pipeline/models.mjs | `9fbf4ef5003599e27bebeb1ff2a54dd55febaab9` | `57af56be98574342f296f773d7ebf1b3155de1bf3557d37e606974ffe46fcd38` |
| agent-team/src/bug-pipeline/process.mjs | `9e11b3a620e3b1fb7c9cf2ee2783e865e93c5f51` | `078765e34f5941de29f801e68b5d8ab438a05d86c6d7331177bbea105d956f6d` |
| agent-team/src/bug-pipeline/review-validation-diagnostic.mjs | `47fd29e6cd7bd58c0db879b0911f1240c8672ac3` | `c4a3d6cd6d1a0b0ef67a22cfc6941fa2c9b9cdaa964357860d103271e9a7e58b` |
| agent-team/src/bug-pipeline/standalone-review.mjs | `3fed5fd8a434f035c5c4f97770e924798d5b9704` | `ceef3f9e4bfce8ffe545688e9af7ed1d15e90bc681a6b1290486c456e173917d` |
| agent-team/tests/bug-pipeline/cloud-review-worker.test.mjs | `9d48a4d3e9ff6dc80fab9efe9793f73bd6c70148` | `1ff13bd96f218a219be8d86fe1015c8e9418f0ec9b55fec81cd313197cd8001c` |
| agent-team/tests/bug-pipeline/models.test.mjs | `cc23e403463bca3f606f66d33f89698f8daa2384` | `7214b96a5e82420fa9e7e412a84cb4f3f17adbb33c03820a0f266bca10a18ce8` |
| agent-team/tests/bug-pipeline/process-output.test.mjs | `e62e33a0b21f015bd362930f1503349a110bd637` | `96bc65bc79dc398fc6d021c0ca95573790a3085d23970212037d47f409ea5553` |
| agent-team/tests/bug-pipeline/review-validation-diagnostic.test.mjs | `3753bfdb97132f53e84feaa9f5262aa6da6c6e6c` | `01e77e175d77d42554d15aaaf95b42ff45bd293735dc8f3ab4200058584209cf` |
| agent-team/tests/bug-pipeline/routing.test.mjs | `d2d1290e1fb70498a109490acec362497218f0c7` | `46844bbf6cc9536515307d1b0b6c2c8caeae9627db19cfc5f52433bc8f0f25fd` |
| agent-team/tests/bug-pipeline/standalone-review.test.mjs | `4d0aa7324d076bf0a2dd7bf0ec84af9224b2f334` | `26f0d48a6eeadb714ec415877f5dd9a51735f1bb5e576a7a88a1e8c68ad3eb2e` |
| docs/cloud-claude-review.md | `01a1db5803063d738625ddf1fea9413230a10a94` | `649717fddf093153e54f95e8cc4a27cb91fa8afb563f68741baf30a4cf22de1b` |
| scripts/quality-gate/claude-bug-review.mjs | `e10296976b8c29c59291a96c985995b24e7d7627` | `0050f0e980ad9901852b5e2f12138d5738969e025131343e11f0a8a8485a3b0a` |
| scripts/quality-gate/claude-bug-review.test.mjs | `bba489a21e74fb75c2107d3e8513f5284e59adcd` | `9590c0681563897222bd88c8861c0a66b3458c4256571e2d772f67108fd2c83f` |

## Release sequence and historical evidence

Source3 historical analysis follows unchanged for the complete runner inventory, original RED/GREEN tests and first substantive peer findings. Its prior references to peer2 or QA3 are historical, superseded by the actual four-review journal and source4 evidence above. Review1 BLOCKED and reviews2/3/4 FAILED remain counted and immutable; no native ledger reset, report normalization, authority reuse or output replay occurs. A separately audited genuine host extension4→5 is required before review5; reviewLedger.max_rounds remains the native historical4. The next Claude review is a sequential gate; after its genuine approval, a NEW independent final Codex and all six current-head native checks precede ordinary protected merge. Automatic trust-root release holds remain unchanged. Clinical506/507 remain blocked pending kernel acceptance and authorized new published-baseline attempts under exclusive runner; no clinical resolution is claimed.

---

# Historical source3 analysis, preserved as historical context

# Analysis

The genuine first peer review identified two source defects and one policy issue. A single 2 MiB combined byte ceiling can terminate a 30-minute Codex session while its stdout consists of streamed progress, before the separate bounded typed-result file is read. Retaining a 32 KiB tail already bounds retained stdout memory; the ceiling was therefore suppressing valid work without providing a memory bound. The runner also classified incidental bare numbers such as `401` and `503` in arbitrary retained stderr as provider status codes.

Root approved a narrow policy change after that peer report: add a trusted boolean `limitStdout` defaulting to `true`; only model calls set it to `false`. Raw stdout bytes continue to be counted and the owned tail remains capped at 32 KiB. Model stderr remains fatal at 64 KiB. The 30-minute timeout, process-group TERM then KILL, 256 KiB typed-result size, schema, regular-file, runtime-path, and symlink checks remain in place. Combined limits and prefix capture remain unchanged for controller, review, verification, and default callers.

Numeric failure categories now recognize HTTP/status-prefixed codes. Known explicit provider markers remain recognized, and incidental source-validation lines with 401 or 503 classify as `other`. Capacity cooldown and later model selection remain covered by existing routing tests. Diagnostics still expose only fixed categories, numeric counters, exit code, and operation.

The exact baseline test uses the same 3 MiB synthetic Codex child that emits JSON progress and writes a valid typed result. With process/models source from Git baseline `b868e72ceb2d2e29fdaf077b3d7144c34481e176`, it fails with `model-execution-failed` because the child hits the 2 MiB combined output limit. The candidate passes that test and reads the valid result. This establishes the regression and correction locally. It does not establish current-head native CI or independent final approval.


## Complete tracked caller-limit evidence

# Production Runner Output-Limit Inventory

Inventory source: read-only Git tree at `b868e72ceb2d2e29fdaf077b3d7144c34481e176`. Values below are evaluated from literal expressions/constants and tracked config, not inferred from tests. The global `createRunner` guard is 64 MiB inclusive. No tracked production caller exceeds it; the largest tracked `createRunner` consumer is 48 MiB.

| Baseline path:line | Production caller/value | Bound evidence |
|---|---:|---|
| `agent-team/src/bug-pipeline/process.mjs:126` | omitted caller value = 2,097,152 bytes (2 MiB) | function default; combined fatal limit |
| `agent-team/src/bug-pipeline/models.mjs:351` | model run = 2,097,152 bytes before v3; now 65,536 stderr-only | prior constant was `2 * 1024 * 1024`; candidate sets `maxOutputBytes: STDERR_LIMIT_BYTES`, `maxStderrBytes: STDERR_LIMIT_BYTES`, `limitStdout: false` |
| `agent-team/src/bug-pipeline/models.mjs:443` | preflight = 32,768 bytes | literal |
| `agent-team/src/bug-pipeline/cloud-review-worker.mjs:63` | 16,777,216 bytes (16 MiB) | literal |
| `agent-team/src/bug-pipeline/cloud-review-worker.mjs:347` | 32,000 bytes | literal |
| `agent-team/src/bug-pipeline/cloud-review-worker.mjs:533` | 262,144 bytes (256 KiB) | literal |
| `agent-team/src/bug-pipeline/comment-review-handoff.mjs:144` | 16,777,216 bytes (16 MiB) | literal |
| `agent-team/src/bug-pipeline/exact-demo-dispatch.mjs:134` | 65,536 bytes | literal |
| `agent-team/src/bug-pipeline/github.mjs:404` | API call default = 2,097,152 bytes | literal default forwarded at line 415; state calls use `STATE_OUTPUT_BYTES = 16 * 1024 * 1024` (16,777,216) at lines 624, 669, 827, 1081, 1200; evidence transport uses `MAX_EVIDENCE_TRANSPORT_BYTES = 48 * 1024 * 1024` (50,331,648) at line 1494, defined in `evidence-limits.mjs` |
| `agent-team/src/bug-pipeline/issue-review-communication.mjs:257` | 2,097,152 bytes (2 MiB) | literal; runner default constructed at line 239 |
| `agent-team/src/bug-pipeline/standalone-review.mjs:298` | 16,777,216 bytes (16 MiB) | literal |
| `agent-team/src/bug-pipeline/standalone-review.mjs:385` | 1,048,576 bytes (1 MiB) | literal |
| `agent-team/src/bug-pipeline/workspace.mjs:107` | 2,097,152 bytes (2 MiB) | literal |
| `agent-team/src/bug-pipeline/workspace.mjs:197` | 1,048,576 bytes (1 MiB) | literal |
| `agent-team/src/bug-pipeline/claude-review-cron.mjs:246`, `cli.mjs:85`, `dashboard-server.mjs:85`, `external-review.mjs:88`, `issue-review-sync.mjs:81`, `release.mjs:1616,1626`, `review-handoff-cli.mjs:80` | no explicit override at construction | each uses runner’s 2 MiB default unless a downstream call supplies a value; downstream `github.mjs` paths are inventoried above |

The separate `agent-team/src/adapters/process-runner.mjs` is not `bug-pipeline/process.mjs` and does not use this 64 MiB guard. Its default is 1,048,576 bytes. Its worker callers forward `config.maxOutputBytes`; tracked `agent-team/config/default.json:16` evaluates to 1,048,576 bytes, while `config.schema.json:43` requires an integer of at least 1,024 but sets no maximum. No tracked override file exists in this source tree. Since that adapter is a separate implementation, this task does not change or infer limits for arbitrary external operator config.

Additional direct non-`createRunner` command runner at `agent-team/src/commands/doctor.mjs:69` passes 65,536 bytes. It does not call the modified runner.


## Independent QA3 source identity, with both hash types

Source-only code `31b11f09331249a93468bf00d8cc3d1313004a72` was independently tested. SHA1 below identifies the actualGit blob; SHA256 hashes the raw file bytes, not the Git header. Six runtime files are mapped, including unchanged CLI/routing corrections from the earlier passing source. A later metadata-only packet head must preserve these exact blobs, as checked by native verification and a plain authenticated exact-head evidence comment.

| File | Git blob SHA1 | Raw SHA256 |
|---|---|---|
| agent-team/src/bug-pipeline/cli.mjs | `b42cd83de4b6442451a7437926271e70b761b712` | `a34f3009edd29bd0b0e5e2f5a707fd80aaf7c1063be7bd4e68e32b7e162b93ed` |
| agent-team/src/bug-pipeline/models.mjs | `9fbf4ef5003599e27bebeb1ff2a54dd55febaab9` | `57af56be98574342f296f773d7ebf1b3155de1bf3557d37e606974ffe46fcd38` |
| agent-team/src/bug-pipeline/process.mjs | `9e11b3a620e3b1fb7c9cf2ee2783e865e93c5f51` | `078765e34f5941de29f801e68b5d8ab438a05d86c6d7331177bbea105d956f6d` |
| agent-team/tests/bug-pipeline/models.test.mjs | `cc23e403463bca3f606f66d33f89698f8daa2384` | `7214b96a5e82420fa9e7e412a84cb4f3f17adbb33c03820a0f266bca10a18ce8` |
| agent-team/tests/bug-pipeline/process-output.test.mjs | `e62e33a0b21f015bd362930f1503349a110bd637` | `96bc65bc79dc398fc6d021c0ca95573790a3085d23970212037d47f409ea5553` |
| agent-team/tests/bug-pipeline/routing.test.mjs | `d2d1290e1fb70498a109490acec362497218f0c7` | `46844bbf6cc9536515307d1b0b6c2c8caeae9627db19cfc5f52433bc8f0f25fd` |

## Real peer1 and phase boundary

Actual official Claude run40261196684 completedSUCCESS but published round1 BLOCKED, comment6407219052, claimad3d0d59-00ca-4906-93f3-9c4b14f904ef, requestaa222d48-9105-46ba-afd7-5816b03b42a2 on oldheadb868e72c. The unchanged old117file packet and complete report/ledger remain preserved. No source merge occurred. This revision addresses numeric diagnostic false positives, documents the complete existing caller-limit inventory (maximum48MiB under64MiB) and makesMODELstdoutvolume nonfatal with bounded owned memory, fatalstderr, timeout/processgroup and typed-result protections.

Fresh independentQA3 on the exact source pairs above reports READY FOR CODEX QA: native1668total/1665PASS/0FAIL/3WindowsSKIP,24 independent fixture groups,54 memory transitions and additional classifier/adversarial cases. Real3MiBstdout +validtypedresult fails oldb868 withoutput-limit and succeeds here at3145813rawstdout/32768captured; continuousstdout stilltimesout andkillsdescendants. The prior partial-selection and unrelatedcontext-failure runs are retained; the authoritative command includesbug-pipeline/*.test.mjs PLUS scripts/quality-gate/claude-bug-review.test.mjs and scripts/automation/protect-demo-secret.test.mjs.

This packet is intentionally frozen BEFORE new-head CI and peer2. After the final metadata head is published, the operator MUST obtain actual successful bug-pipeline-tests,secret-scan,frontend-tests,archive-tests,gate,browser-e2e checks on that exacthead from app15368, run actualnative immutablepacket verification, and publish a PLAIN authenticated PR comment/updatedbody with that exacthead, allsixcheck IDs/results and the six SHA1→SHA256 mappings BEFORE requesting peer2. The previous automatic-status-marked CI comment was omitted from reviewer feedback; that will not be repeated. Futurehash/CI results are not invented in this immutable packet.

The Claude review being requested is the next sequentialgate, not an approval that must already exist before it canreview. NEWfinalCodex follows a genuine approved peer and precedes the user-directed ordinaryprotectedmanualmerge. These remaining release stages are not claimedcomplete and do not invalidate the actual implementation/QA evidence. Automatictrust-rooteligibility/releaseHold remainsunchanged; no nativehumanapproval/admin/forcebypass is claimed. Userexplicitlyauthorizescontinuationpreservinghistory.

Originalclinicalrun40249337703 exactcause and lostephemeraloutput remainUNKNOWN. No clinicalattempt/counter/checkpoint has beenreset/replayed, and no appclinicalresolution is claimed. Real exactmainCLIinference40251755127 succeeded separately. SupportedmanagedHTTPS withoutclientAuthorization has now been verified as AUTHENTICATED l2v-hub/admin via/user and permissions; it is not merelyanonymouspublicaccess. StaleexplicitGH_TOKEN overrides had caused401; no tokenwasextracted/copied/rotated.


## Actual independent QA4 completion

NEW independent gpt-6-sol high reviewer used reserved session 7f147816-563d-424c-96e9-69a0f2909985 after the earlier independent actor completed25PASS but hit model capacity before its verdict/seal. The incomplete actor and all its25 proof records remain frozen under independent-qa4-interrupted; this does not refund or hide that session. Completion reviewer verdict: READY FOR CODEX QA, code 88b9a33d4a879b85bbf8b543fd474b390461d304, raw seal SHA256 7c9b88960854d38fbae4f842cef4122ab906d413ecffe82f946dc231577937b4. The completion independently authenticates the exact15-file Git/raw-hash projection and unchanged native validators/runtime protections. Its actual tests/report are in independent-qa4. This is implementation QA, not a Claude peer approval or a final release gate.
