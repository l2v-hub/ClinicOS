# Independent diff and security review

Reviewed all seven source files (including new untracked files), existing GitHub feedback/event filter, durable-state schema, author tests, and complete diff versus baseline `8124b1bc88c0f086b1ee328214f87f4802005d11`.

The trusted-main sibling does not save durable state, invoke a model, deploy, merge or close issues. It uses the already configured PAT for actual workflow notifications. The fixed namespaces prevent feedback loops, and untrusted comments cannot replace hashed structured report approval. Old failed attempts remain failed and spent. Scope seven and all nineteen frozen guard files are verified byte-identical where required. CLI stdout is bounded operational metadata; its intentional output is not debug logging.

## Findings

- **SEC-1, medium, `agent-team/src/bug-pipeline/issue-review-communication.mjs:283`.** `write` verifies bridge authorization before the full asynchronous subject inventory. A bridge-role revocation injected during its second `/issues/32` read (inside the write guard, after initial inventory) still permits the first label mutation; actual loopback HTTP transport records `authorizedAtWrite: false`. The following mutation fails, leaving one unauthorized update. This violates AC4. This is an application policy guard finding; no actual GitHub token or permission change was performed, and no claim is made that GitHub itself accepts a forbidden API call. Revalidate current authority at the final transport boundary after the subject inventory and add a regression at this await boundary, preserving immutable subject checks and budgets.
- **COR-2, medium, same file `:284` and source guard `:378`.** Source author/body verification occurs before `subject(expected)` awaits. Editing the authorized comment body during `/issues/32` after its source GET causes publication of a mirror containing the old body/digest; only the later acknowledgement detects drift. One stale PR feedback write is recorded. AC3/AC4 provenance requires checking the source at the final publication boundary, rather than only before the full cohort inventory. A remote multi-resource transaction cannot be made atomic by client reads; the concrete stale window demonstrated here is the guard's own subsequent network work. Keep that limitation explicit rather than promising atomicity.

Both failures are independently reproducible using the actual module and a new HTTP fixture. No author's test fixture was imported. See `independent-probes.mjs` / `independent-probes.json` and actual browser finding screenshots/trace/video. QA has not changed implementation source.

## Security checklist

| Check | Result |
|---|---|
| Secrets | No real credentials in source or QA evidence; provider executables denied and credential environment removed for full regression |
| PHI | Synthetic code-review fixture only; no database or patient access |
| Logging | New production messages are bounded review metadata, sanitized code findings and constant diagnostic codes; no provider error stdout |
| Input validation | Bounded source sizes, comment inventories, identity strings and exact report digests exercised |
| AuthZ | **BLOCKED: SEC-1**; initial-role rejection passes, during-guard revocation fails |
| Injection/XSS | Surface uses textContent; product mirrors quote sanitized UNTRUSTED data, never approval; existing tests pass |
| Dependencies | No package or lockfile additions, existing local tooling borrowed without installs |
| Config | Trusted main/repo/event checks present; PAT required; no model secret, release guard, budget or database changes |

Native workflow execution and actual PAT event delivery remain root-owned and unverified here. No Max approval is claimed.
