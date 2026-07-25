---
id: "api.backend.post-internal-ai-patient-demographics-64"
kind: "api-endpoint"
title: "POST /internal/ai/patient/demographics"
status: "observed"
summary: "POST /internal/ai/patient/demographics endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/internal-ai.ts"
    symbol: "internalAiRouter"
    line_start: "90"
    line_end: "93"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `api.backend.post-internal-ai-patient-demographics-64` represent in ClinicOS?

## Canonical Definition

api.backend.post-internal-ai-patient-demographics-64 is the canonical api-endpoint named POST /internal/ai/patient/demographics.

## Inputs

- Method: `POST`
- Path: `/internal/ai/patient/demographics`
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

- `backend/src/routes/internal-ai.ts:90-93` — internalAiRouter

## Related Knowledge

- `belongs-to` → `project.backend`
