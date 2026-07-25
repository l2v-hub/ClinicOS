---
id: "api.backend.post-patients-by-param-therapies-98"
kind: "api-endpoint"
title: "POST /patients/:patientId/therapies"
status: "observed"
summary: "POST /patients/:patientId/therapies endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-therapies.ts"
    symbol: "router"
    line_start: "39"
    line_end: "74"
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
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `api.backend.post-patients-by-param-therapies-98` represent in ClinicOS?

## Canonical Definition

api.backend.post-patients-by-param-therapies-98 is the canonical api-endpoint named POST /patients/:patientId/therapies.

## Inputs

- Method: `POST`
- Path: `/patients/:patientId/therapies`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,400,404,500]`; response model: `not explicitly declared`.

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

Observed error statuses: `[400,404,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/patient-therapies.ts:39-74` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.patient`
