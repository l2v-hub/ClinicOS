# Author report — implementation 3

Status: implemented-awaiting-independent-QA.

The root-owned reserved change adds `observations.graphqlFailure` with only `errorsShape` and `category` fixed enums immediately before the existing `READONLY_GRAPHQL_REJECTED` stop. Any own `errors` property remains rejected, including null and empty arrays. The projection inspects no more than 20 errors, caps message and code lengths, and does not retain provider fields or values. No transport, endpoint, query, authorization mode, request count, workflow, installer, or read sequence was changed. Only the two contracted source files changed.

The preserved real protected runs remain failures: account run `39827112860` stopped at `ACCOUNT_IDENTITY:READONLY_GRAPHQL_REJECTED`; project-token run `39829997131` stopped at `TOKEN_IDENTITY:READONLY_GRAPHQL_REJECTED`. These results do not establish invalid or expired credentials or an endpoint defect. No live provider or credential action was performed for this implementation.

Validation: contract validator passed. Node 22 syntax check passed. Focused inspection and workflow tests passed: 185 tests, 0 failures (the original 157 plus 28 new mode/payload cases). Tests use synthetic payloads and assert blocked outcome, original phase and code, one GraphQL request, zero CLI and snapshot reads, exact projection keys, and no sentinel disclosure.

No initial author test failure occurred. This report does not claim independent QA, release, or publication.
