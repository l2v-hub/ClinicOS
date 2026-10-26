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
