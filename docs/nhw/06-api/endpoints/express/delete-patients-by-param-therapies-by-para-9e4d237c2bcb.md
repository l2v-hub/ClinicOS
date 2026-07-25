---
id: 'api.backend.delete-patients-by-param-therapies-by-param-100'
kind: 'api-endpoint'
title: 'DELETE /patients/:patientId/therapies/:therapyId'
status: 'observed'
summary: 'DELETE /patients/:patientId/therapies/:therapyId endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/patient-therapies.ts'
    symbol: 'router'
    line_start: '169'
    line_end: '188'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/patient-therapies.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.patienttherapy'
    evidence: 'backend/src/routes/patient-therapies.ts'
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

What does `api.backend.delete-patients-by-param-therapies-by-param-100` represent in ClinicOS?

## Canonical Definition

api.backend.delete-patients-by-param-therapies-by-param-100 is the canonical api-endpoint named DELETE /patients/:patientId/therapies/:therapyId.

## Inputs

- Method: `DELETE`
- Path: `/patients/:patientId/therapies/:therapyId`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[204,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patientTherapy.delete","prisma.patientTherapy.findFirst"]`
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

- `backend/src/routes/patient-therapies.ts:169-188` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.patienttherapy`
