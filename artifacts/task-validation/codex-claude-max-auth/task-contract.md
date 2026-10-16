# Task Contract

## Task

The user explicitly chose Claude Max for final review, avoiding separately billed Anthropic API inference. Continue authorized GitHub activation after the user updated CLINICOS_BOT_TOKEN.

## Impact Classification

Authentication selection, role credential isolation, diagnostic redaction, Actions and documentation. No application source/schema/clinical data changes; preserve unrelated cleanup SQL.

## Current Behaviour

Actual Actions run38967368595 now verified Actions PR approval enabled and active cumulative main ruleset25275509 requiring bug-pipeline-tests. Main protected=true. Existing regression/sandbox pass. Claude review currently receives ANTHROPIC_API_KEY and API metadata authentication returned401. Official Claude Code Action documentation supports Pro/Max OAuth via claude setup-token on hosted Actions.

## Expected Behaviour

Actions final review explicitly uses subscription mode with CLAUDE_CODE_OAUTH_TOKEN, never falling back to a separately billed API key. Recognize a legacy setup-token stored under the old secret name only by its known OAuth prefix. Preserve exact-SHA review and all durable four-attempt/four-review budgets. Never manufacture an OAuth token or copy personal session cookies.

## Acceptance Criteria

- AC1: Subscription-mode reviewer receives OAuth only, even if an API key is also present; missing OAuth blocks rather than switching billing.
- AC2: OAuth is absent from executor, verification and controller subprocess environments; capture redaction covers OAuth tokens and assignments.
- AC3: Hosted Actions manual exact-SHA readiness checks configuration through official CLI without inference; do not equate auth status with paid inference, remote validity or completed review.
- AC4: Verify actual updated bot configuration; preserve existing protections/default workflow permissions and independent QA.
- AC5: Personal consent/token generation remains in the user's official local CLI; secrets are entered directly in Actions settings, never chat or repository/log files.

## Test Plan

Meaningful credential isolation and no-billing-fallback tests, an actual Node reviewer subprocess with synthetic credentials, redaction checks, existing complete regression suite, YAML/inlineJS validation and native Actions configuration probe. Carry forward unchanged application build/browser evidence explicitly.

## Evidence Plan

Task packet includes native selected logs, independent QA/report/hash manifest and test results. Record actual admin success and credential presence separately from remote Claude review. No inference is required merely to check configuration.

## Gate Status

READY FOR IMPLEMENTATION
