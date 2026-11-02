# Independent integrated security QA

Verdict: PASS for the reviewed source scope; no actionable finding remains
from this review. This is independent Codex QA, not Claude approval, execution
authority, a deployed-state result, or authorization to close issue522.

Reviewed source SHA: 03529a96c3a37e4ffb4989497ca3db9fe32a9968
Reviewed source tree: 2f7da7847987983b221a0f27519dd868d03e7f03
Base: bc880a6dccc40d8dbad73c718c8aa4256562d254
Reviewer: /root/auth_expiry_qa, read-only source role.

## Source and independent evidence

Reviewed all eleven changed source paths against base, concentrating on the
new renewal helper/controller, explicit workflow and shared CI test command.
Seven UI blobs are byte-identical to b1d6d89c77ae1abe65a38d22e22c29b6a906f9bf;
execution-receipt.json records exact Git blob equivalence for every UI path.

Fresh focused checks on the integrated SHA using Node v26.3.0:

- Renewal policy/controller/transport tests: 49 PASS, zero failed or skipped.
- UI availability and rendered Login tests: 7 PASS, zero failed or skipped.
- Tracked source clean and HEAD/tree unchanged through these checks.

The build and 26 synthetic actual-App browser scenarios passed independently
on the byte-identical b1 UI source. They are reused by proven blob identity,
not falsely described as a new integrated browser run. The full1586 frontend
suite passed on the older c104 candidate and remains historical regression
evidence only. Exact integrated CI (including Linux/Node22) is still required.

Previous c104 P2 and the private harness CJS-adapter failure remain preserved
in the earlier independent-ui-qa report and logs. b1 resolved simulator404
expiry by invalidating and rechecking status; independent26-case replay proved
the stale five-profile picker is removed at both1280 and390 widths.

## Security review

- Application authentication, signed simulator identity and server expiry
  gates are unchanged from base. No client clock/role/card creates an identity
  or authorization grant. Unknown/unavailable status blocks starting login.
- The operation is limited to DEMO_AUTH_EXPIRES_AT on the fixed established
  demo project, environment, service and domain. No alternate target, arbitrary
  variable key, AUTH_MODE relaxation, dataset flag, source switch, SQL or volume
  action is exposed. Renewal is canonical UTC and bounded to at most seven days.
- The CLI accepts only exact trusted protected-main/workflow_dispatch context,
  exact reviewed SHA and first run attempt. Workflow defaults to inspect; stage
  is explicit. Actions are commit-pinned, checkout has no persisted credentials,
  tests precede credential injection, and the environment/shared railway-demo
  concurrency target is fixed. The shared mandatory CI command adds, rather
  than replaces or weakens, the new policy tests.
- An independent canonical issue owner is required; the protected470/475/506/516
  scopes cannot be reused. A stored request or workflow actor is not authority.
  The native trusted-host verifier must consume the real human action before
  execution; default/CLI authorizer is absent. The binding covers exact subject,
  release, ownership, expiry transition and preserved history without adding
  review budget. Post-merge native consumption remains a pending real action.
- Durable claim and write-intent fence replay/concurrent claimants. The updated
  owned check re-observes canonical subject after permission awaits, preventing
  the demonstrated owner/execution replacement at the final boundary. Tests
  retain this failure-path coverage. Revocation, source/request/history drift
  and stale fingerprint fail before the Railway mutation.
- Preflight uses existing typed demo inventory plus public auth/readiness facts,
  requires synthetic/demo tier, expected old expired date, healthy DB/policy,
  exact domain/deployment/source metadata and no active rollout. It neither
  reads variable values/secrets nor clinical records. The final write is only
  one variableUpsert with skipDeploys:true; it stages configuration, not a deploy.
- Uncertain submissions are recorded and never automatically replayed; an
  acknowledged write followed by lost recording is not claimed as a success.
  Subsequent operations are held for explicit operator reconciliation.
- Finite receipt serialization rejects extra/raw error fields and credential
  aliases. Transport failures do not print secret/provider response contents.

## Limits and pending release gates

No real Railway API call, credential inspection, variable mutation, auth session,
clinical read/write, provider call, remote state change, merge or deployment was
performed by this reviewer. Tests use synthetic credentials/mocked APIs only.
Mock tests do not prove actual Railway target access, GraphQL acceptance, source
deployment identity or the live post-renewal role list. Backend account/target
access limitations reported earlier are not silently treated as resolved here.

Before any actual stage/release: genuine allowed Claude review on the exact
published source, exact-head CI and final Codex reconciliation, protected merge,
current-main source proof, a separately consumed real human operation capability,
fresh read-only demo preflight, the single guarded stage, explicit verified
deployment and synthetic-only online verification of all five profiles are
required. Preserve PR520 round6 allowance exclusively for PR520. Keep issue522
open until its operational and online acceptance is demonstrated.

Evidence: command-results.json and execution-receipt.json bind source/tree,
command statuses, log hashes, UI equivalence and pending gates. Full focused
stdout/stderr logs are retained beside this report. No assertion was disabled
to get passing results. Source freeze may be released for evidence/publication
only if all eleven source blobs remain identical to this reviewed source.
