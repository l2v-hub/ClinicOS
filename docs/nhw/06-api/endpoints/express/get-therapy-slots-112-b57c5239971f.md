---
id: "api.backend.get-therapy-slots-112"
kind: "api-endpoint"
title: "GET /therapy-slots/"
status: "observed"
summary: "GET /therapy-slots/ endpoint implemented by the express runtime."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/routes/therapy.ts"
    symbol: "router"
    line_start: "26"
    line_end: "192"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/therapy.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.medicationadministration"
    evidence: "backend/src/routes/therapy.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.patienttherapy"
    evidence: "backend/src/routes/therapy.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `api.backend.get-therapy-slots-112` represent in ClinicOS?

## Canonical Definition

api.backend.get-therapy-slots-112 is the canonical api-endpoint named GET /therapy-slots/.

## Inputs

- Method: `GET`
- Path: `/therapy-slots/`
- Request inputs: `["req.query.date"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.medicationAdministration.findMany","prisma.patientTherapy.findMany"]`
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

- `backend/src/routes/therapy.ts:26-192` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.medicationadministration`
- `reads` → `data.model.patienttherapy`
