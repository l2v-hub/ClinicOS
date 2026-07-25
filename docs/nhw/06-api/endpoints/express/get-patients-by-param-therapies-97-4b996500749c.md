---
id: "api.backend.get-patients-by-param-therapies-97"
kind: "api-endpoint"
title: "GET /patients/:patientId/therapies"
status: "observed"
summary: "GET /patients/:patientId/therapies endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-therapies.ts"
    symbol: "router"
    line_start: "18"
    line_end: "36"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.patient"
    evidence: "backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.patienttherapy"
    evidence: "backend/src/routes/patient-therapies.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `api.backend.get-patients-by-param-therapies-97` represent in ClinicOS?

## Canonical Definition

api.backend.get-patients-by-param-therapies-97 is the canonical api-endpoint named GET /patients/:patientId/therapies.

## Inputs

- Method: `GET`
- Path: `/patients/:patientId/therapies`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patient.findUnique","prisma.patientTherapy.findMany"]`
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

- `backend/src/routes/patient-therapies.ts:18-36` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.patient`
- `reads` → `data.model.patienttherapy`
