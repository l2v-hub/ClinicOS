---
id: "api.backend.post-internal-ai-patient-therapies-67"
kind: "api-endpoint"
title: "POST /internal/ai/patient/therapies"
status: "observed"
summary: "POST /internal/ai/patient/therapies endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/internal-ai.ts"
    symbol: "internalAiRouter"
    line_start: "102"
    line_end: "105"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `api.backend.post-internal-ai-patient-therapies-67` represent in ClinicOS?

## Canonical Definition

api.backend.post-internal-ai-patient-therapies-67 is the canonical api-endpoint named POST /internal/ai/patient/therapies.

## Inputs

- Method: `POST`
- Path: `/internal/ai/patient/therapies`
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

- `backend/src/routes/internal-ai.ts:102-105` — internalAiRouter

## Related Knowledge

- `belongs-to` → `project.backend`
