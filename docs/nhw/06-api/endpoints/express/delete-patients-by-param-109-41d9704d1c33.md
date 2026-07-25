---
id: 'api.backend.delete-patients-by-param-109'
kind: 'api-endpoint'
title: 'DELETE /patients/:id'
status: 'observed'
summary: 'DELETE /patients/:id endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/patients.ts'
    symbol: 'router'
    line_start: '889'
    line_end: '914'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/patients.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.importjob'
    evidence: 'backend/src/routes/patients.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.patient'
    evidence: 'backend/src/routes/patients.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'delete'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `api.backend.delete-patients-by-param-109` represent in ClinicOS?

## Canonical Definition

api.backend.delete-patients-by-param-109 is the canonical api-endpoint named DELETE /patients/:id.

## Inputs

- Method: `DELETE`
- Path: `/patients/:id`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,403,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.importJob.updateMany","prisma.patient.delete"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[403,404,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/patients.ts:889-914` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.importjob`
- `writes` → `data.model.patient`
