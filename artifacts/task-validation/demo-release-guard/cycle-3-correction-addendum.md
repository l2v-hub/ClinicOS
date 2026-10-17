# Cycle 3 issue publication and actual-close guard addendum

Independent QA2 FAILED VALIDATION on three reproducible failures: hold applied during viewIssue still permits completion comment; hold applied inside real GitHub setIssueStatus during awaited label operations still permits PATCH closed; failed PATCH leaves an earlier false issue-already-closed comment. All candidate2 sources/evidence and independent-qa-cycle-2 remain historical immutable.

Root authorizes these two additional files only:
- agent-team/src/bug-pipeline/github.mjs
- agent-team/tests/bug-pipeline/github.test.mjs

Carry a fresh durable release/hold/revision guard into the actual GitHub mutation boundary, including every awaited label operation before actual PATCHclosed. Recheck after issue view immediately before publication; no statement of closure before successful closure API. Preserve unrelated labels, existing lifecycle callers/cache semantics and four-round ledgers. Use backwards-compatible optional guard callbacks where appropriate; never treat a synthetic stub-only check as proof of the real adapter. Test all real API request boundaries with holds injected after awaits, current release identity/revision changes, cache and failure paths, and truthfulness on close API503. Do not widen scope further. Final candidate3 all12sources/hash and fresh independent five-phase QA required. No live mutation/commit/push/deploy in implementation.
