---
id: "api.backend.get-patients-by-param-104"
kind: "api-endpoint"
title: "GET /patients/:id"
status: "observed"
summary: "GET /patients/:id endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patients.ts"
    symbol: "router"
    line_start: "28"
    line_end: "41"
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
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `api.backend.get-patients-by-param-104` represent in ClinicOS?

## Canonical Definition

api.backend.get-patients-by-param-104 is the canonical api-endpoint named GET /patients/:id.

## Inputs

- Method: `GET`
- Path: `/patients/:id`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patient.findUnique"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[404,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/patients.ts:28-41` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.patient`
