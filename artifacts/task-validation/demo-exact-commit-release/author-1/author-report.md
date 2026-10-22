# Author report

Status: READY FOR CODEX QA. Source frozen for independent review; this report is author validation, not independent certification.

The bounded change adds the fixed `native-exact-commit-v1` source policy through `preflight-exact` and `deploy-exact`. The default remains `main-trigger-v1`, and historical receipts without a policy retain that strict meaning. The explicit policy accepts zero triggers only when trigger pagination is complete, the source repository, project token, service/environment, and demo domain match the fixed target, and both domain collections are present. Existing valid single-main-trigger topology remains accepted. Foreign branches, repositories, target identities, duplicate triggers, incomplete collections, and unknown policies reject before mutation.

Exact policy execution requires the fixed repository, main ref, immutable SHA, positive Actions run/attempt, Actions marker, fixed main workflow ref, and push or workflow_dispatch event. Receipts bind the selected policy. Independent preflight/release verification rejects unknown or explicitly mismatched policy; live native inspection uses the policy bound by the immutable receipt. Legacy receipts cannot authorize a zero-trigger live topology.

The sole deployment mutation remains `serviceInstanceDeployV2` with the exact source SHA and fixed service/environment. No mutation retry was added. Successful proof still requires native commitHash, SUCCESS, all fixed identities, a unique active deployment, and uncached live readiness for that deployment ID. A native reinspection after readiness also rejects source/target/active-deployment drift. Mutation denial, uncertain transport, invalid returned ID, and polling errors stop after one submission in synthetic tests.

The demo workflow runs the credential-free focused test command before either demo-token step, then invokes the two explicit exact operations. The production job and all bytes preceding the demo job are unchanged. Existing main-only execution, concurrency, read-only permissions, immutable checkout, pinned demo actions, and demo credential isolation are preserved.

Validation used Node v24.19.0 with no installation or external provider calls:

- Focused actual workflow command: 150 tests passed, zero failed/skipped. Includes actual CLI child processes with synthetic Web Responses, fixed official URL/header checks, exact mutation arguments and receipt output.
- Full `node --test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs`: 725 total, 722 passed, zero failed, 3 expected native Windows skips.
- Contract validator, formatting check, and diff whitespace check passed.
- First full run retained: 718 passed, 4 failures because a historical trace fixture was absent from the sparse checkout, 3 native Windows skips. Root restored the exact tracked historical blob; its SHA256 is recorded in source-manifest.json. The separate second full run passed.
- Initial missing-validator and invalid-contract attempts are retained privately. Root amended the contract and reservation before source edits.

Only the three approved tracked paths differ. Tracked historical proof diff is empty. Baseline and frozen source copies have distinct inodes; file hashes, byte counts, production-prefix identity, and historical fixture checksum are in source-manifest.json. Raw outputs and separate attempt history remain in the private author directory.

Limits: hosted Node 22, native Windows, live provider authorization, and actual deployment acceptance were not exercised by author validation. Fixture success supplies no provider or deployment proof. No credentials were discovered, no external requests were made, no Git/GitHub/state writes were performed by the author, and no provider configuration was changed.

Remaining gates before provider dispatch: fresh independent QA, actual Claude review, fresh final Codex review, six required native checks, and ordinary protected main merge. Actual exact-commit provider acceptance and independent native/live proof remain subsequent requirements. A rejection must preserve history and safe diagnostics without unchanged repeated mutation attempts.
