# Task Contract

## Task
- Title: PR483 QA8 curated review packet
- Slug: bug-batch-432/review-packet-8
- Type: evidence publication candidate
- Date: 2026-10-21

## Impact Classification
Documentation and synthetic evidence only. No application source, test, database, provider, runtime, Git reference or GitHub modification by packet preparer. Root owns publication, canonical state, actual review, merge and deployment.

## Current Behaviour
Independent QA8 completed on source ae12862e8ff9ce03f117fc646ecd11a4a8a8bb56, with retained QA7 checks, multiple failed QA8 harness invocations, successful individual phases, remaining UI8 PASS and one actual scheduled-dose branch UNRUN. Old sealed records must remain immutable.

## Expected Behaviour
A compact public candidate lets a reviewer trace all seven original issues, F1/F2 and the recorded-outcome follow-up to authentic phase evidence and exact source identity, while keeping failure history and limitations visible.

## Acceptance Criteria
- AC1: Bind exact tested source, report, STOP nonce, source digests and unchanged prior proof hashes; distinguish production identity from the one changed SQL guard fixture.
- AC2: Provide per-issue acceptance/proof indexes and actual selected application screenshots/videos, with internal receipt renderers explicitly labeled.
- AC3: Preserve QA7 FAILED aggregate and QA8 failed phase history, historical versus fresh counts, named SQL counts and the unrun/schema limitations.
- AC4: Candidate remains below25MiB with no raw logs, traces, private SQL rows or credential material; no publication/review/deployment claim.

## Test Plan
Read-only source diff and SHA-256 inventories; source/proof equality checks; original receipt/hash verification; PNG decode; video full decode and representative frame privacy inspection; JSON/relative-link audit. Application suites are represented only by their original provenance and are not rerun for curation.

## Evidence Plan
README.md, validation-report.md, source-manifest.json, proof-index.json, issue-proof-index.md/json, media-index.json, curated receipts and selected synthetic media. Original QA8 final report and STOP copied byte-for-byte. Private publication-proposal.json contains exact candidate digests for root.

## Risks
Scheduled individual drug-dose detail has no actual App mount and remains UNRUN. Missing recordedAt cannot be a schema-valid DB row and remains unit-only. Actual native checks, Claude review, final Codex review and deployment are independent root-owned gates. Evidence curation cannot close any issue.

## Gate Status
READY FOR IMPLEMENTATION — evidence curation only; candidate now ready for root review.
