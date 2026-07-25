---
id: "api.backend.patch-patients-by-param-narrative-sections-by-param-75"
kind: "api-endpoint"
title: "PATCH /patients/:patientId/narrative-sections/:sectionKey"
status: "observed"
summary: "PATCH /patients/:patientId/narrative-sections/:sectionKey endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/narrative-sections.ts"
    symbol: "router"
    line_start: "72"
    line_end: "72"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/narrative-sections.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "patch"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `api.backend.patch-patients-by-param-narrative-sections-by-param-75` represent in ClinicOS?

## Canonical Definition

api.backend.patch-patients-by-param-narrative-sections-by-param-75 is the canonical api-endpoint named PATCH /patients/:patientId/narrative-sections/:sectionKey.

## Inputs

- Method: `PATCH`
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

- `backend/src/routes/narrative-sections.ts:72-72` — router

## Related Knowledge

- `belongs-to` → `project.backend`
