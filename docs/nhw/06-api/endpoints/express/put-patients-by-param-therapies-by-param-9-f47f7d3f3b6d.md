---
id: "api.backend.put-patients-by-param-therapies-by-param-99"
kind: "api-endpoint"
title: "PUT /patients/:patientId/therapies/:therapyId"
status: "observed"
summary: "PUT /patients/:patientId/therapies/:therapyId endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-therapies.ts"
    symbol: "router"
    line_start: "77"
    line_end: "166"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.patienttherapy"
    evidence: "backend/src/routes/patient-therapies.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "put"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `api.backend.put-patients-by-param-therapies-by-param-99` represent in ClinicOS?

## Canonical Definition

api.backend.put-patients-by-param-therapies-by-param-99 is the canonical api-endpoint named PUT /patients/:patientId/therapies/:therapyId.

## Inputs

- Method: `PUT`
- Path: `/patients/:patientId/therapies/:therapyId`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patientTherapy.findFirst"]`
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

- `backend/src/routes/patient-therapies.ts:77-166` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.patienttherapy`
