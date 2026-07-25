---
id: "api.backend.post-patients-seed-105"
kind: "api-endpoint"
title: "POST /patients/seed"
status: "observed"
summary: "POST /patients/seed endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patients.ts"
    symbol: "router"
    line_start: "43"
    line_end: "72"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patients.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.patient"
    evidence: "backend/src/routes/patients.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `api.backend.post-patients-seed-105` represent in ClinicOS?

## Canonical Definition

api.backend.post-patients-seed-105 is the canonical api-endpoint named POST /patients/seed.

## Inputs

- Method: `POST`
- Path: `/patients/seed`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patient.createMany"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/patients.ts:43-72` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.patient`
