---
id: "api.backend.post-patients-107"
kind: "api-endpoint"
title: "POST /patients/"
status: "observed"
summary: "POST /patients/ endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patients.ts"
    symbol: "router"
    line_start: "718"
    line_end: "812"
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
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `api.backend.post-patients-107` represent in ClinicOS?

## Canonical Definition

api.backend.post-patients-107 is the canonical api-endpoint named POST /patients/.

## Inputs

- Method: `POST`
- Path: `/patients/`
- Request inputs: `["req.body"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,400,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patient.create","prisma.patient.findUnique"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[400,409,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/patients.ts:718-812` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.patient`
