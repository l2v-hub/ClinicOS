# Task Contract

## Task

Complete the user-authorized GitHub issue automation setup. User supplied Claude Max OAuth; native38969585616 now sees the secret and the official CLI recognizes it. Keep subscription-only authentication, never switch to paid Anthropic API.

## Impact Classification

Bounded bootstrap review of automation PR471 before default-branch activation. GitHub model/review/state operations only. No clinical/application/schema/data changes; preserve unrelated cleanup SQL. The user authorizes the existing PR review/fix loop and necessary default-branch activation after all gates pass.

## Current Behaviour

The main required check, Actions permissions and model/runtime readiness are verified. PR471 remains draft and workflows cannot react to issue events until integrated. The ordinary pipeline includes a durable four-review Claude loop; setup PR itself has not received an authenticated Claude review.

## Expected Behaviour

A manual exact-SHA admin-only job uses the existing read-only reviewer and the existing CAS state store, persisting its running review BEFORE model inference. A fixed setupReview471 record on codex/bug-control preserves the same four-attempt limit across source changes, Actions runs, credentials and interruptions. Actual review evidence is published on PR471, while Codex owns corrections. No merge/deploy is performed by this helper.

## Acceptance Criteria

- AC1: Exact repo/SHA/open same-repository PR471/admin actor are checked before review; current head is checked again before posting.
- AC2: Use Claude Max only, existing Read/Glob/Grep restrictions, no MCP/commands/write tools and no GitHub/deploy credentials in the reviewer process.
- AC3: CAS budget reservation precedes inference. Failed/stale/interrupted calls cannot reset limits; interrupted remote running state is blocked for explicit recovery.
- AC4: Restore previous hashed reports and ledger for the existing helper; no fifth review, no fresh packet per retry and no auto approval/reset.
- AC5: Publish actual structured review bound to its SHA. Preserve existing batch records and unrelated task files. No helper merge/deploy or closing issues.
- AC6: Review the complete runtime/workflow diff and current QA evidence, including subscription mode and previous QA findings. Missing functional/evidence prerequisites require blocked/changes-requested, never fabricated readiness.

## Test Plan

Temporary real Git checkouts with synthetic Claude providers: reserve-before-inference, CAS failure prevents inference, successful restored approval reuse, stale/current head checks, admin preflight, interruptions and four-attempt cap. Full relevant existing suite, independent QA, exact-SHA native regression job, then one actual subscription review only after source QA passes.

## Evidence Plan

Independent source manifest and validation report, actual native token/configuration log, real Claude structured reports in durable state and PR comments plus run artifact. Actual model access is distinct from CLI recognition. No token values, clinical data or secret environment dumps.

## Gate Status

READY FOR IMPLEMENTATION
