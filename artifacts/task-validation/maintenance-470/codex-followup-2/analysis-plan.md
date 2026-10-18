# Maintenance 470 continuation 6 — plan only for QA5 F1

No source, harness, frozen-author/QA packet, Git, provider, GitHub or other state edits performed. This report is the only output. Waiting for root's durable continuation6 reservation and final contract before implementation.

QA5 correctly found a packaging defect I missed in author verification. Exact candidate `ce7da2f7f5f3f149e4a5a16046843f067252e807` passes all 115 tests in the full checkout, but its actual hosted sparse checkout excludes `.github/workflows/deploy-backend.yml`, which the mandatory workflow test reads. Independent exact-sparse result is **114 pass / 1 ENOENT / 0 skipped/cancelled**. The failure must remain recorded; retaining the workflow test is necessary.

## Minimal source scope

1. In **only the new demo-storage-inspect job**, replace one sparse-checkout property with this multiline value:

```yaml
          sparse-checkout: |
            scripts/maintenance
            .github/workflows
```

Do not change any old job's checkout. Both paths are directories compatible with actions/checkout's default cone-mode sparse checkout. Adding the workflow directory makes the existing meaningful test available; do not disable the test or broaden checkout to the entire repository.

2. Add a small assertion inside the existing workflow test in `scripts/maintenance/demo-storage-inspect.test.mjs` requiring this job's sparse-checkout list to contain exactly the two required directories. A literal multiline assertion is sufficient for this fixed reviewed job; keep it scoped to the substring between demo-storage-inspect and demo-inventory, not to old jobs elsewhere in the workflow. This is regression protection for F1 and must not replace the actual sparse-checkout execution below.

No edit is needed to `demo-storage-inspect.mjs` or either imported helper. The wrapper/hash should remain identical to ce7. Existing job suffix, target, auth, branch/SHA guards, dedicated concurrency, two binding observations/private drift comparison, tests-before-secret ordering and provider/receipt behavior remain unchanged. Only workflow packaging plus its regression assertion change; no installation/package/app/config/data changes.

## Required contract/reservation boundary

Root creates the new manual-issue-aware continuation6 reservation/contract before either edit. Preserve all four original implementation records, continuation5 author source seal/report and **FAILED** independent QA5 result at ce7; never reset, overwrite or relabel them. Manual issue ownership has no PR; do not invent a PR or invoke a legacy budget path that dereferences subject.pr.number. New continuation attribution/authorization is root-owned. Existing explicit user authorization to continue while preserving history applies; no new user consent is needed.

The final new contract should permit only the workflow/test edits above, owned external author fixture/evidence and a new packet if root specifies one. Keep the original contract and amendment immutable; append new bounded scope rather than editing the historical record. Root must supply the exact new packet/reservation before GO.

## Author verification after GO

Run the existing test command in the source worktree with credentials absent and preserve its status/output. Then reproduce the **actual cone sparse checkout** in a new author-owned temporary local clone under the new continuation's external directory. Do not use a new Git worktree, clone a remote, run package installation, copy credentials or modify frozen attempt5 fixtures.

The intended fixture sequence is:

```text
git clone --shared --no-checkout <existing maintenance checkout> <owned sparse fixture>
git -C <fixture> sparse-checkout set --cone scripts/maintenance .github/workflows
git -C <fixture> checkout --detach ce7da2f7f5f3f149e4a5a16046843f067252e807
```

The author cannot commit. If root has not committed the fix yet, overlay **only** the changed workflow and test bytes from the candidate worktree into those two checked-out fixture paths. Record base ce7, overlay paths and SHA-256s; compare all candidate/imported source bytes between fixture and worktree. Label this accurately as an **uncommitted candidate overlay in an exact cone sparse checkout**, not execution of a nonexistent committed SHA. The fixture's sparse-checkout definition must be derived from/asserted against the candidate job's two paths; record the exact patterns and cone-mode setting. Before testing, require both directories and the workflow file to exist, and prove unrelated application directories are absent.

Run `node --test scripts/maintenance/demo-storage-inspect.test.mjs` through the established credential-free runner with explicit PATH-only environment and isolated verification home. The existing synthetic binding suite injects fake transports; its actual CLI negative test exits before requests. Capture exit status and the complete safe TAP/runner receipt. Expected result is **115/115 pass, 0 failed/skipped/cancelled**, with no removed tests and the new sparse assertion inside the existing test. Do not interpret a full-checkout pass alone as resolution.

Verify `git diff --check`, only the two authorized source deltas, unchanged wrapper/helper hashes and old-job suffix hash, original author/QA5 packet hashes and all prior-present proof hashes. Freeze the new author source/harness, overlay/sparse patterns, runner commands/environment-mode metadata, TAP, input/source/proof manifests and reports, then STOP. Report any failed verification honestly and preserve its evidence. No provider/GitHub/network/secret/DB operation or commit/push is needed for author verification.

## Fresh independent gate

After root commits/publishes through the authorized flow, fresh independent QA must clone **the exact new committed candidate SHA**, apply the two-directory cone sparse checkout without an overlay, and execute the same presecret tests under the credential-free runner. It should independently confirm new-job packaging, unchanged old jobs/helpers/security protections and the preserved QA5 failure history. Actual Claude and final Codex reviews must bind that exact SHA before any protected diagnostic dispatch. Remote CI/provider behavior, complete storage cleanup and issue closure remain outside this packaging fix's evidence.

Plan-only STOP. No implementation changes have been made.
