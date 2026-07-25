---
id: "api.backend.get-patients-by-param-cartella-110"
kind: "api-endpoint"
title: "GET /patients/:id/cartella"
status: "observed"
summary: "GET /patients/:id/cartella endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patients.ts"
    symbol: "router"
    line_start: "918"
    line_end: "938"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patients.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.cartella"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `api.backend.get-patients-by-param-cartella-110` represent in ClinicOS?

## Canonical Definition

api.backend.get-patients-by-param-cartella-110 is the canonical api-endpoint named GET /patients/:id/cartella.

## Inputs

- Method: `GET`
- Path: `/patients/:id/cartella`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.cartella.findUnique","prisma.patient.findUnique"]`
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

- `backend/src/routes/patients.ts:918-938` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.cartella`
- `reads` → `data.model.patient`
