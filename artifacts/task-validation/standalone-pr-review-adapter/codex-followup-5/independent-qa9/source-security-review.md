# Independent source and security review

Subject: 0d8326db7d3e53691ce6f8127a70c06c3666b426, integrated main45033a3949742218b1c9d23a37a0c94776cd5bd5. Reviewed frozen27-file scope and relevant main-to-subject controller diff; raw diff remains private in integrated-source-review.diff. No correctness/security findings were reproduced in this scope.

| Area | Result | Evidence / reviewed boundary |
|---|---|---|
| Scope | PASS | Controller, tests and operating documentation; no clinical API, Prisma, frontend, database or deployment mutation was performed by QA. |
| Source identity | PASS | Original27 hashes match root-reserved integration freeze; independently copied source has zero hardlinks; all5863 tracked materialized inputs remain identical after tests. |
| R1 recovery | PASS | comment-review-handoff.mjs:579 and standalone-review.mjs:589,873: only verified idempotent projections or definite exact-head OPEN rejected merges resume; uncertain writes retain their reservation. Independent changed-head/closed/read-unknown adoption probes reject safely. |
| R2 notice isolation | PASS | comment-review-handoff.mjs:309 and435: background waiting path has no notice actor/read/write; explicit CLI repair is idempotent. |
| R3 authorization | PASS | attempt-budget.mjs:23,38,67 and operator-authorization.mjs:40: exact prefix/content binding and externally consumed action capabilities; missing cutover permits zero legacy exemptions. Stored receipts are not evidence of an actual grant. |
| R4 liveness | PASS | github.mjs:15 and pipeline.mjs:87: 1..30 minute elapsed exponential delays; at least30-minute window before exhaustion; failed persistence aborts mutation pass. |
| R5 merge ownership | PASS | github.mjs:12, standalone-review.mjs:995 and1065:330-second lease and final300-second preparation deadline; 30-second actual command timeout retained in github.mjs invocation. |
| R6 trust root | PASS | review-policy.mjs:2 and cli.mjs:15 protect runbook/model/workspace tests and controller/tooling surfaces. Production fixed automatic infrastructure allowlist is EMPTY. Harmless synthetic documentation scopes exercise only the core merge boundary; no native approval is represented as real. |
| R7 transport/CAS | PASS | github.mjs:537 uses one shared pinned Contents/blob decoder. 8MiB serialized state and16MiB output remain; 35 main GitHub +12 main handoff titles retained and executed by the full suite. Native stale-CAS, guarded-CAS and disjoint rebase probes preserve concurrent state. |
| Secrets/PHI/logging | PASS | No credential discovery, dumps, live patient data, provider or DB access. New harness data and actors are synthetic; actual canonical snapshot is read privately and unchanged. Source and trace sensitive-pattern checks found zero matches. Safe operation diagnostics do not preserve arbitrary stderr. |
| Input/path safety | PASS | Existing type, SHA, byte/node/depth, path and report/packet bounds remain. Adversarial metadata/base64/UTF8/SHA/content cases fail before mutation. No use of untrusted download_url. |
| Injection/AuthZ | PASS | Shell-free argument execution remains; current maintainer and exact subject/native/CAS guards are rechecked; private browser uses textContent and denies any request beyond own loopback5592. No SQL/XSS/application route changes. |
| Dependencies/config | PASS | No setup dependency or production configuration change was needed. CLI imports unchanged actual source; process environment is credential-free verification mode and fixtures only. |

Residual gates: native hostedNode22/Windows, actual new Claude review, final Codex and manual protected merge belong to root. This review does not supply live verifier integration or provider/native human approval. The real clinical application is outside this controller QA scope.
