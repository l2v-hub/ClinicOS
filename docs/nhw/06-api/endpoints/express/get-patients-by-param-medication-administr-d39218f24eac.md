---
id: "api.backend.get-patients-by-param-medication-administrations-101"
kind: "api-endpoint"
title: "GET /patients/:patientId/medication-administrations"
status: "observed"
summary: "GET /patients/:patientId/medication-administrations endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-therapies.ts"
    symbol: "router"
    line_start: "191"
    line_end: "217"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.medicationadministration"
    evidence: "backend/src/routes/patient-therapies.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.patient"
    evidence: "backend/src/routes/patient-therapies.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `api.backend.get-patients-by-param-medication-administrations-101` represent in ClinicOS?

## Canonical Definition

api.backend.get-patients-by-param-medication-administrations-101 is the canonical api-endpoint named GET /patients/:patientId/medication-administrations.

## Inputs

- Method: `GET`
- Path: `/patients/:patientId/medication-administrations`
- Request inputs: `["req.params","req.query.date","req.query.limit"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.medicationAdministration.findMany","prisma.patient.findUnique"]`
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

- `backend/src/routes/patient-therapies.ts:191-217` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.medicationadministration`
- `reads` → `data.model.patient`
