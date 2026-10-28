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
