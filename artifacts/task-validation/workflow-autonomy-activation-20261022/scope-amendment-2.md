# Scope amendment2, before two additional source edits

Preserve the actual authorized-label recovery contract when queue discovery normalizes missed events. Source analysis during author1 identifies github.discoverQueue({normalize:true}) currently applies label writes before pipeline can exclude claimed operator-owned issues. Merely switching to readonlydiscovery loses supported cron recovery for a legitimate codex-run label after a missed original event.

Add exactly:
- agent-team/src/bug-pipeline/github.mjs
- agent-team/tests/bug-pipeline/github.test.mjs

Minimum adaptation: existing discoverQueue accepts an explicitly validated excluded issue-number list, supplied from fullcollectionclaimed ownership by pipeline, and filters those issues before applyIntakeLabels. Normal authorized new queue recovery is preserved. No broadened authorization, new event or token, state-transport change, checks projection, provider code, arbitrary filter, or changed exclusion of review protocol comments. Existing public callers without exclusions retain their supported behavior. Meaningful negative tests ensure no labelwrite on excludedclaimedissues before normalization, malformed exclusions failclosed, unclaimedauthorizedissues stillnormalize and no models/credentials/provider invoked. Tests remain synthetic. Preserve all author attempts/logs; this is a dependency amendment, no new attempt or history reset.
