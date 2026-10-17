# Task Contract

## Task
- Title: demo-source-topology
- Slug: demo-source-topology
- Type: config
- Date: 2026-10-17

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

The fixed demo service source matches ClinicOS but the accepted scoped inventory has zero GitHub deployment triggers. One prior explicit create failed with a generic sanitized provider error. Its cause remains unknown. Official serviceConnect operates at service scope across matching environments. Existing project token is scoped to demo and cannot establish unfiltered whole-project visibility merely by completing pagination.

## Expected Behaviour

A separate trusted-main, default/read-only inspector records bounded project/environment/service topology and scoped trigger metadata. It never exposes a mutation or substitutes a successful inspection for deployment configuration, release preflight, clinical review or hosted E2E. Whole-project visibility remains explicitly unproven under the existing environment-scoped token, even if only demo is returned.

## Acceptance Criteria

- AC1: Only the frozen project/environment/service/repository/domain and exact current reviewed main can be inspected, with existing token inside the credential-bearing workflow step only.
- AC2: Bound and validate every connection/page/id/name; follow complete cursor pagination within explicit limits, reject repeated cursors, malformed/foreign/duplicate ownership, unknown data and transport failures without retries or raw provider reflection.
- AC3: Receipts report pagination completeness separately from environment-scoped visibility and always disallow service-wide connection; mutation-like inputs fail before network access.
- AC4: Preserve all legacy source/release guard files and budgets; no SQL, deployments, reconnect, trigger writes, provider literal retries, new secrets or broader identity.
- AC5: Meaningful independent adversarial tests and safe QA-only browser proof demonstrate outcomes and privacy; fresh QA is required before publication.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Parsing, provenance, bounds and authorization context |
| Integration | yes | Multi-page mocked HTTP client, drift, no mutation/retry |
| API | yes | Real HTTP transport fixtures only; no live provider invocation |
| Playwright | yes | Safe QA-only receipt surface, no credentials/provider calls |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Reject reflection of arbitrary provider fields/errors and credential-shaped metadata |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

Operator implementation candidate 3/4 of the existing demo-source configuration effort (previous 2/4 retained). This is an explicit new user-authorized workflow prerequisite analysis, not an automatic fallback or a new reset budget. No provider mutation is authorized by this packet. This helper cannot prove whole-project visibility with an environment-scoped project token; it must remain inspect-only. Pagination snapshots are not atomic across resources. No inference from an API rejection to a permission/provider-literal diagnosis. Author stops before independent QA; root alone owns state, publication, merge and any later provider decision.

## Gate Status

READY FOR IMPLEMENTATION
