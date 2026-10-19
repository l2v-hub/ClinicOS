# Independent QA4 — standalone PR review adapter

Verdict: **READY FOR CODEX QA**. No actionable correctness or security finding was established on the frozen fourth implementation. This is independent verification of the candidate, not Claude approval, a live Codex model result, publication, adoption, merge, deployment or issue closure. Three earlier failed independent QA rounds remain counted; no fifth implementation attempt was performed.

Baseline: d1324cb3dd9ac2a9eafdc7eb3d88abc399da7f55. Candidate branch: codex/standalone-pr-review. Source freeze: cycle4/source-freeze.json, SHA256 d88c088fe9a38d16c9c89d4e7263643a878a779ae98c558e6b74da4693d10a08. All fifteen frozen source/test/doc paths and all 214 preexisting packet files were hashed before QA and verified unchanged after QA. Eight supporting production modules were separately hashed. Only independent-qa4 files were created by this reviewer.

## Mandatory phases

| Phase | Result | Independent evidence |
| --- | --- | --- |
| 0 Contract | PASS | task-contract.md; original/cycle4 contracts inspected; logs/contract-validation-absolute.log validates the existing cycle4 contract |
| 1 Full diff and scope | PASS | logs/reviewed-full-diff.patch plus direct review of all newly added standalone source/test/docs; source-hashes.json; supporting-source-hashes.json; logs/source-hygiene.log |
| 2 Fresh tests/types/build | PASS | bug-pipeline-tests.log: 681 tests, 678 PASS, zero FAIL, 3 existing Windows-only SKIP; frontend-types.log, frontend-app-types.log, frontend-node-types.log, frontend-build-retry.log; 31 additional independent probe checks described below |
| 3 Browser evidence | PASS | browser-result.json; test-results/browser-capacity-cass.json; five result screenshots, two videos, two traces; reload and error assertions; playwright-report/index.html |
| 4 Security | PASS | Explicit matrix below; media-security-validation.json; actual read-only GitHub receipt with 82 reads and zero writes/models/providers |

## Full scope and acceptance review

Normal batch identity, plan, editable-file, model and release guards remain present. Standalone subjects use their actual PR identity and optional real source issues rather than manufacturing bug batches. Adoption verifies native repository/nonfork/open/ready identity, an authenticated frozen merge base, the complete base-to-head Git blob/mode delta, every packet digest and historical implementation/review prefixes. Latest passed source/config Git objects must equal the current source/config objects; evidence-only publication can advance the head. Original proof files remain at original paths and revision packets append.

The authenticated GitHub comment protocol binds actor, request, claim, round, exact SHA and full tracked inventory. CAS claim occurs before reviewer inference. Stored/imported reports retain unchanged compact schema/comment bounds while handling UTF-8 correctly. Duplicate claims, stale reports, unauthorized or changed owners and mutable historical proofs fail closed. Exclusive labels use the real PR; ordinary batch issue projections remain the existing path.

The independent standalone Codex boundary reviews source and frozen evidence as data without executing PR code, installing packages, running PR tests, following PR instructions or exposing controller credentials. Trusted CLI wiring and the immutable eighteen-path infrastructure policy were inspected. Existing running QA and merge reservations are pending ownership: second callers make no state/label/model/merge changes. Only an actual clean Claude report, a separate Codex proof, exact SHA, current native checks and unchanged feedback permit the protected infrastructure merge path. Actual application PR393 remains outside that policy and its release hold is retained. Diagnostic PR491 is limited to its real three read-only topology-inspection source paths. The bootstrap itself still requires genuine Claude review before authenticated local execution of the candidate tools.

## Independent edge verification

All fresh extra probes import the frozen production modules. Their GitHub/CAS/check/model callbacks are explicitly synthetic unless the separate actual-GitHub receipt says otherwise.

- Twenty-one checks in test-results/independent-boundaries.json cover the immutable eighteen-path policy, real temporary-file CLI Unicode submissions, concurrent finalize/pipeline readers with zero second-caller writes/inference, large GitHub Contents/blob state round trips, exact bounds and malformed encoding/size/digest/UTF-8 rejection.
- Four checks in test-results/revision-recovery-verification.json independently retain historical proof bytes, reject rewritten earlier packet contents and verify authentic terminal recovery behavior.
- Two checks in test-results/actual-git-unicode-verification.json read actual local Git objects for PR393/491 descriptors and import multilingual reports against those trees using declared synthetic native checks. Full four-report subjects remain valid. These checks do not claim live adoption.
- F5: test-results/capacity-verification.json rebuilds an organically populated 24-subject/92-report valid state at 8,358,608 bytes, thirty thousand bytes below the eight-MiB maximum. A new request persists, but the claim fails with the owned capacity code before a durable running round, report or inference: zero consumed review rounds and zero result comments. No arbitrary reason-field padding is used.
- F6: test-results/disjoint-cas-verification.json runs two actual standalone controllers with a shared production createGitHub store. While subject81 QA awaits, subject82 request and claim persist. The strict first PUT conflicts; a fresh validated disjoint rebase preserves the peer claim and persists the owner's verified result. Exactly one synthetic QA callback and one protected synthetic merge occur; repeated finalize has zero writes/inference/merge.
- test-results/normal-standalone-cas-verification.json repeats that barrier with the actual normal comment-handoff controller as the independent writer. Both ownership records survive.
- test-results/normal-pipeline-cas-verification.json runs the actual normal runPipeline implementation path with the production strict-CAS store. During its execution callback, an actual standalone controller adopts, requests and claims a new independent subject. A real fixture409 occurs, then the normal implementation attempt still changes from running to passed through its original nested attempt reference, reaches ready and retains the other running review. Exactly one synthetic implementation, QA and review callback occur. No real model or GitHub mutation occurs.

The fresh 681-test regression also covers same-entity conflicts, changing shared root fields, duplicate IDs, invalid merged ownership, guard re-execution after authorization/nonce changes, nested reference retention, exhausted bounded retries, default strict saves, capacity across every entity collection, maximal multilingual/escaped report representation, two-MiB subject headroom and owned failure-code sanitization. The validator/guard and intended body are captured before awaits; an old body is never retried against a newer SHA. Default release callers retain strict CAS.

## Actual GitHub verification

The reviewer independently used the current frozen createGitHub and standalone modules under a wrapper rejecting every GH write method, input body, non-read command, model and provider invocation. test-results/live-readonly-receipt.json records 82 actual GET/check reads:

| PR | Actual head verified | Packet files | Full tree/digests/native checks |
| --- | --- | --- | --- |
| 393 | d6bb325b1e767c9554e64da433c3f91b0217ee8a | 18 | PASS |
| 491 | c7ccc7b5a88ca4c6cb1276319f084293f780e5c6 | 12 | PASS |

Both complete Git deltas/modes, frozen merge bases, all packet byte digests and all current required/optional native check results passed at the receipt timestamp. No actual adoption, claim, report, model, protected merge, provider operation or clinical release was performed.

## Browser evidence and isolation

The QA-owned loopback-only surfaces drive actual production modules with synthetic transport, checks, CAS and explicitly synthetic model/merge callbacks. They exercise request/claim exclusivity, stale/duplicate rejection, authenticated CJK import, codex-review-ready projection, clinical hold preservation, one infrastructure receipt and terminal idempotence, plus live execution of the independent capacity and disjoint-CAS probes. Two page reloads retain the asserted results; browser console, page and relevant HTTP error arrays are empty.

Result screenshots: screenshots/01-authenticated-report-import.png, 02-release-hold-preserved.png, 03-infrastructure-receipt-terminal.png, 04-capacity-refused-before-inference.png and 05-disjoint-cas-owner-and-peer-preserved.png. Screenshots03 and05 were visually inspected for legible final values. All five PNGs decode, both WEBM videos decode with ffmpeg and both trace ZIPs pass CRC/path/member/credential scans. media-security-validation.json records the audit. The HTML report is QA-generated, not a native Playwright runner report.

Execution was serialized with flock on the existing /tmp/clinicos-browser-qa.lock, coordinated with the independent450 fullstack owner. No lockfile deletion, process termination, user Vite modification, database, application backend, paid provider or production data was used. The lane was released back to450 after both successful runs.

## Security matrix

| Check | Result |
| --- | --- |
| Secrets | PASS: no new credentials; complete own evidence and embedded trace resources scanned; diagnostic output exposes owned codes/boolean preflight only |
| PHI | PASS: synthetic fixtures and scalar real-Git verification metadata only |
| Logging | PASS: bounded status/failure codes; no new clinical payload logging |
| Input bounds | PASS: exact path/mode/schema/manifest/report/comment/UTF-8/aggregate/reservation checks; malformed blob and stale report negatives |
| AuthZ | PASS: maintainer identity, native subject, nonce, round and live guard rechecks; reviewers have no merge/provider/application execution authority |
| Injection | PASS: no application SQL/HTML route; synthetic report surfaces escape rendered report data or use textContent; no PR code execution on authenticated review PC |
| Dependencies | PASS: no manifest/lockfile changes or new installed package |
| Config | PASS: no clinical feature flag, CORS, backend, schema, API URL or deployment policy weakening; temporary build API target was unavailable loopback only |

## Limits and accurate operational status

The source is ready for root Codex QA and subsequent genuine Claude bootstrap review. A fixture callback is not an actual Claude/Codex approval. The native CLI preflight in logs/native-preflight.log finds Codex CLI/auth available but sandbox unavailable in this managed cloud. No nested inference was attempted, no authentication directory copied and no sandbox bypass used. Authenticated local finalize remains to be demonstrated on the user's actual writable PC after root QA and genuine Max approval.

The bounded three-rebase policy is best-effort persistence. Exhausted retries or a concurrent change to the same subject still fail closed and can retain a running reservation after its owner's local result could not be saved. Explicit diagnosis is required; there is no automatic repeated inference or budget reset. This isolated CAS proof does not establish the cause of any real hosted432/450 controller failure.

The first frontend build lacked worktree dependencies; an owned ignored root node_modules symlink reused the already-installed trusted cache, then was removed after fresh build/types. No package or lockfile was changed. Initial browser attempts waited on the shared lane or used an unavailable ffmpeg cache; all logs are preserved, and successful runs used the existing trusted450 cache. An initial relative contract-validator argument was normalized by the existing CLI into a slug; the subsequent absolute path validates successfully. These setup attempts did not alter source or historical proof bytes.

Final Decision: **READY FOR CODEX QA**.

Codex must now re-run the QA Gate.
