# Independent QA6 — demo environment administration

Source: `0bb595288a5b0f4ae15d70247a4291ec7a1f386d`; implementation: `1d48231f42f36920085c039833d78a4f21957450`. Reservation nonce: `2e39fb08-577e-443d-831f-325a3110c7fd`, reserved before this independent session. Author STOP was read before validation. This reviewer did not author or modify the implementation.

**Offline QA verdict: PASS. Final Decision: PARTIAL — actual administrator REST behavior remains unproven.** No blocking source defect was reproduced in the bounded offline checks. This does not approve a deployment or establish applied repository/environment settings.

| Actual command / validation | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| `node --test agent-team/tests/bug-pipeline/repository-settings.test.mjs` | 80 | 0 | 0 |
| `node --test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs` | 1060 | 0 | 3 |
| Independently authored actual CLI/fake HTTP transport and actual workflow-block probes, `node --test /workspace/.clinicos-cloud/demo-exact-independent-qa6-20261021/independent.test.mjs` | 43 | 0 | 0 |
| Actual CLI policy-list404 refusal, `node --test /workspace/.clinicos-cloud/demo-exact-independent-qa6-20261021/policy404.test.mjs` | 2 | 0 | 0 |

Each command ran once, on Node `v24.19.0`, under the unchanged trusted `createRunner` verification environment with a PATH-only parent environment. Independent CLI children received a synthetic sentinel credential and an injected fake `fetch`; no real credential or network was used. The full suite completed in 27.9 seconds. Its three skips are native Windows PowerShell scheduler, ACL, and bootstrap cases. Node22 was not installed or run locally; current native CI remains a separate root-owned check. Counts are per invocation and overlap between the targeted and full suites.

Independent probes execute the real helper entry point, not a rewritten implementation. They exercise realistic PUT defaults, reviewer/timer/self-review/admin preservation, complete three-page custom protection inventory, exact fixed environment/repository/routes, main-only policy, repeat idempotence, dispatch event/reviewed SHA/workflow SHA/path/ref/actor checks, preflight denials/conflicts, partial PUT/POST failures, post-mutation drift, no mutation retry, safe error output, secret inventory unknown states, and the explicit repository-secret boundary. The credential-free JavaScript extracted from the actual workflow also ran for valid and invalid administration selections and stale or mismatched trust contexts.

The read-only root metadata receipt was inspected offline: the normal integration sees existing environment `glistening-friendship / demo`, ID `20880188544`, with `deployment_branch_policy: null`; its branch-policy list returns HTTP404 while custom protection inventory returns200. The independent CLI404 reproduction confirms a fixed safe error, exit1 and **zero writes**, both with null policy and an already restricted mock environment. Whether the administrator bot can enumerate policies before enabling custom policy remains **UNKNOWN**. These integration-scoped observations do not establish a source defect or justify treating404 as an empty inventory. The passing mocks model a readable200 policy inventory; they do not prove live API compatibility.

Source review confirms only the three contracted source paths changed against `e895b503f653eda3c02cdcd3bb3c36bceef9269a`. The existing `configureRepository` function is byte-identical to that base. All six prior PR sources match the prior QA5 frozen hashes. All 3,144 frozen source/proof/author-evidence/trusted-helper files retain their hashes and inodes; the tracked working tree is clean after testing. Exact source digests, commands, per-attempt receipt digests and counts are in `validation-summary.json`. Raw cases, logs and freeze manifests remain private.

No source/index/ref, GitHub/provider, canonical reservation or historical evidence edits occurred. No settings were applied; no actual token, settings dispatch, clinical runtime, controller approval, merge, deployment or issue closure was claimed. No reusable environment configuration change was needed. The prior #470 read-only diagnostic completion was supplied by root; this reviewer did not repeat it. Root owns current publication/native checks, actual review requirements and any bounded administrator preflight needed to resolve the live compatibility unknown.

Independent QA is stopped. Further source changes require a new exact-source validation decision.
