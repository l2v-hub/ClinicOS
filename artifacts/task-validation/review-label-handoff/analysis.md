# Analysis

The source queue is controller-owned. PR481/483 each spent one actual failed Claude round
without a report, and have verified implementation/checks but independent release holds.
Current `publishState` writes source labels only; no codex-review-ready vocabulary exists.
The installed cron selects requested/finished only, and cannot ingest a manually started
Claude's authenticated comment report. Simply relabeling does not repair those contracts.

The new channel deliberately uses comment-requested/comment-running to avoid old cron
pickup, reserves a CAS-backed round before review, and imports a structured report from the
claimed GitHub principal with request/claim IDs, SHA, PR, round and tracked finding locations.
GitHub comments remain untrusted data; report author authorization and current cohort/head
are rechecked before writes. CAS is atomic for ledger only, not across PR/comments/ACL resources.

Root orchestrates security/ledger design and Codex final QA integration. Luna implements the
bounded label projection and adversarial fixture tests, and drafts the local prompt. No global
provider load is inferred. The actual Max reviewer is started by the user locally and never
replaced by an API key or a fixture in readiness claims.
