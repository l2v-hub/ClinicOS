---
id: "api.backend.put-patients-by-param-narrative-sections-by-param-74"
kind: "api-endpoint"
title: "PUT /patients/:patientId/narrative-sections/:sectionKey"
status: "observed"
summary: "PUT /patients/:patientId/narrative-sections/:sectionKey endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/narrative-sections.ts"
    symbol: "router"
    line_start: "71"
    line_end: "71"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/narrative-sections.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "put"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `api.backend.put-patients-by-param-narrative-sections-by-param-74` represent in ClinicOS?

## Canonical Definition

api.backend.put-patients-by-param-narrative-sections-by-param-74 is the canonical api-endpoint named PUT /patients/:patientId/narrative-sections/:sectionKey.

## Inputs

- Method: `PUT`
- Path: `/patients/:patientId/narrative-sections/:sectionKey`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: None observed; response model: `not explicitly declared`.

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

Observed error statuses: None observed. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/narrative-sections.ts:71-71` — router

## Related Knowledge

- `belongs-to` → `project.backend`
