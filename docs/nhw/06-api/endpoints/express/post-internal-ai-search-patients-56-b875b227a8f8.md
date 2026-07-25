---
id: "api.backend.post-internal-ai-search-patients-56"
kind: "api-endpoint"
title: "POST /internal/ai/search/patients"
status: "observed"
summary: "POST /internal/ai/search/patients endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/internal-ai.ts"
    symbol: "internalAiRouter"
    line_start: "49"
    line_end: "52"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `api.backend.post-internal-ai-search-patients-56` represent in ClinicOS?

## Canonical Definition

api.backend.post-internal-ai-search-patients-56 is the canonical api-endpoint named POST /internal/ai/search/patients.

## Inputs

- Method: `POST`
- Path: `/internal/ai/search/patients`
- Request inputs: `["req.body"]`
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

- `backend/src/routes/internal-ai.ts:49-52` — internalAiRouter

## Related Knowledge

- `belongs-to` → `project.backend`
