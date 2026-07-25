---
id: "api.backend.get-patients-by-param-narrative-sections-72"
kind: "api-endpoint"
title: "GET /patients/:patientId/narrative-sections"
status: "observed"
summary: "GET /patients/:patientId/narrative-sections endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/narrative-sections.ts"
    symbol: "router"
    line_start: "20"
    line_end: "27"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/narrative-sections.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `api.backend.get-patients-by-param-narrative-sections-72` represent in ClinicOS?

## Canonical Definition

api.backend.get-patients-by-param-narrative-sections-72 is the canonical api-endpoint named GET /patients/:patientId/narrative-sections.

## Inputs

- Method: `GET`
- Path: `/patients/:patientId/narrative-sections`
- Request inputs: `["req.params.patientId"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: None observed
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

- `backend/src/routes/narrative-sections.ts:20-27` — router

## Related Knowledge

- `belongs-to` → `project.backend`
