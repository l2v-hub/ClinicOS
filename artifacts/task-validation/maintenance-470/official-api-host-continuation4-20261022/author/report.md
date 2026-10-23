# Author report — official Railway API host continuation 4

## Scope confirmation before edits
I will edit exactly the six allowlisted source and test files named in the task contract. Production scope is limited to changing the three existing Railway API endpoint literals from `backboard.railway.app` to the documented official `backboard.railway.com` origin. I will add one synthetic transport-boundary test to each corresponding test file, updating only stale endpoint expectations needed for tests to reflect the official address. No fallback, retry, redirect, auth, query, request-count, permission, workflow, UI, deployment policy, or dependency changes are in scope.

The six-file source baseline matched `snapshot-before.json`. Final verification confirmed that the snapshot file set is unchanged and exactly the six allowlisted files changed.

## Result
Status: implemented-awaiting-independent-QA. Each production client now sends its existing request to `https://backboard.railway.com/graphql/v2`. Tests exercise the public transport clients with synthetic tokens and fake fetch implementations. They assert the literal destination, one request with no legacy-host fallback, redirect refusal, method/body, and existing project-token or account-bearer header scope. Existing test expectations that encoded the old host were updated.

Syntax checks passed for all three changed production modules. The four contracted suites passed: 659 tests reported, 0 failures. The run used Node 22 and synthetic/local fixtures only. No test failure occurred during this author run; the failure-shaped cases in the suites are expected assertions. No installation or live provider action was performed.

Prior live failures remain unresolved: project run `39843385618` produced a nonempty GraphQL error array classified as unknown and stopped at `TOKEN_IDENTITY:READONLY_GRAPHQL_REJECTED`; earlier account/project failures `39827112860` and `39829997131` remain preserved. These observations do not establish token validity or invalidity, host causality, or resolution of the distinct production CLI invalid-token issue. This report makes no independent QA, approval, merge, deployment, or release claim.
