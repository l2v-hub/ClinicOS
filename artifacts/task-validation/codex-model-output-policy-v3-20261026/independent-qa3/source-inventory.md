# Independent frozen-source runner inventory

Read-only Git search at candidate31: `logs/tracked-runner-inventory.txt` (72 matches across production source, config and scripts, excluding tests/docs/artifact prose). All tracked paths and copied context were checked against frozen Git. No production `createRunner` maxOutputBytes value exceeds 50,331,648 bytes (48 MiB); the guard permits 67,108,864 bytes inclusive.

| Candidate path:line | Evaluated bytes / propagation |
|---|---|
| agent-team/src/bug-pipeline/process.mjs:126 | default 2,097,152; validate at133; default limitStdout true130; omitted options preserve combined and prefix |
| agent-team/src/bug-pipeline/models.mjs:364 | 65,536 stderr-only; maxStderr same; capture32,768; limitStdout false368. Preflight457:32,768 combined |
| agent-team/src/bug-pipeline/cloud-review-worker.mjs:63,347,533 | 16,777,216 / 32,000 / 262,144 |
| agent-team/src/bug-pipeline/comment-review-handoff.mjs:144 | 16,777,216 |
| agent-team/src/bug-pipeline/exact-demo-dispatch.mjs:134 | 65,536 |
| agent-team/src/bug-pipeline/github.mjs:404,415,432,442 | helper default2,097,152; optional value forwarded unchanged |
| agent-team/src/bug-pipeline/github.mjs:624,669,827,1081,1200 | STATE_OUTPUT_BYTES defined10 =16,777,216 |
| agent-team/src/bug-pipeline/github.mjs:1494 | MAX_EVIDENCE_TRANSPORT_BYTES from evidence-limits.mjs:3 =50,331,648 |
| agent-team/src/bug-pipeline/issue-review-communication.mjs:257 | 2,097,152 |
| agent-team/src/bug-pipeline/standalone-review.mjs:298,385 | 16,777,216 /1,048,576 |
| agent-team/src/bug-pipeline/workspace.mjs:107,197 | 2,097,152 /1,048,576 |
| scripts/automation/protect-demo-secret.mjs:338,356 | 16,384 (factory defaults to modified runner323) |
| scripts/quality-gate/claude-bug-review.mjs:107 | 2,097,152 (review-bug-setup.mjs:23 creates runner) |
| scripts/quality-gate/verify-isolated-services.mjs:177,190 | 2,097,152 (factory167) |

Construction-only callers (downstream helper overrides above, otherwise2MiB): claude-review-cron246/baseRun250 forwards options+envMode; cli85; cloud-review-worker683; dashboard-server85; external-review88; issue-review-communication239; issue-review-sync81; release1616/1626; review-handoff-cli80; review-bug-setup23; verify-isolated-services167; protect-demo-secret323. Verification adapter uses separate isolation runner; no hidden maxOutputBytes override in verification.mjs.

Separate adapter: agent-team/src/adapters/process-runner.mjs:69 default1,048,576. adapters/git22,162; adapters/github8; workers/claude-development-worker54; workers/codex-qa-worker46 forward config.maxOutputBytes. Tracked config/default.json:16 is1,048,576; config.schema.json:43 requires integer>=1024 with no upper bound. Arbitrary external config is not bounded by tracked defaults and does not enter this changed createRunner implementation. commands/doctor.mjs:69 also uses that independent adapter (65,536). scripts/automation/inspect-demo-bearer-readiness.mjs defines an unrelated fetch runner.

No actual tracked-caller regression identified. Keep the existing64MiB guard. Native controller, verification, review and helper tests passed in the1668-test selection.
