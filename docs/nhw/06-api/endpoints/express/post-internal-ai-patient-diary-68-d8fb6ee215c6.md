---
id: "api.backend.post-internal-ai-patient-diary-68"
kind: "api-endpoint"
title: "POST /internal/ai/patient/diary"
status: "observed"
summary: "POST /internal/ai/patient/diary endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/internal-ai.ts"
    symbol: "internalAiRouter"
    line_start: "106"
    line_end: "115"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/internal-ai.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `api.backend.post-internal-ai-patient-diary-68` represent in ClinicOS?

## Canonical Definition

api.backend.post-internal-ai-patient-diary-68 is the canonical api-endpoint named POST /internal/ai/patient/diary.

## Inputs

- Method: `POST`
- Path: `/internal/ai/patient/diary`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: None observed; response model: `not explicitly declared`.

## Dependencies

Persistence calls: None observed
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: None observed. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/internal-ai.ts:106-115` — internalAiRouter

## Related Knowledge

- `belongs-to` → `project.backend`
