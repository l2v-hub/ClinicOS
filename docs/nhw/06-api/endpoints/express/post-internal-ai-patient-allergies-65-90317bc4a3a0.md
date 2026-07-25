---
id: 'api.backend.post-internal-ai-patient-allergies-65'
kind: 'api-endpoint'
title: 'POST /internal/ai/patient/allergies'
status: 'observed'
summary: 'POST /internal/ai/patient/allergies endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/internal-ai.ts'
    symbol: 'internalAiRouter'
    line_start: '94'
    line_end: '97'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/internal-ai.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'post'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `api.backend.post-internal-ai-patient-allergies-65` represent in ClinicOS?

## Canonical Definition

api.backend.post-internal-ai-patient-allergies-65 is the canonical api-endpoint named POST /internal/ai/patient/allergies.

## Inputs

- Method: `POST`
- Path: `/internal/ai/patient/allergies`
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

- `backend/src/routes/internal-ai.ts:94-97` — internalAiRouter

## Related Knowledge

- `belongs-to` → `project.backend`
