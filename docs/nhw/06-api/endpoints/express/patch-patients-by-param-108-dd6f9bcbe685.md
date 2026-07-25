---
id: "api.backend.patch-patients-by-param-108"
kind: "api-endpoint"
title: "PATCH /patients/:id"
status: "observed"
summary: "PATCH /patients/:id endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patients.ts"
    symbol: "router"
    line_start: "816"
    line_end: "877"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patients.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.patient"
    evidence: "backend/src/routes/patients.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "patch"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `api.backend.patch-patients-by-param-108` represent in ClinicOS?

## Canonical Definition

api.backend.patch-patients-by-param-108 is the canonical api-endpoint named PATCH /patients/:id.

## Inputs

- Method: `PATCH`
- Path: `/patients/:id`
- Request inputs: `["req.body","req.body.codiceFiscale","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,400,404,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patient.findUnique","prisma.patient.update"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[400,404,409,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/patients.ts:816-877` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.patient`
