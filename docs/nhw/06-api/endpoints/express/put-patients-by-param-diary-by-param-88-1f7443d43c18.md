---
id: 'api.backend.put-patients-by-param-diary-by-param-88'
kind: 'api-endpoint'
title: 'PUT /patients/:patientId/diary/:entryId'
status: 'observed'
summary: 'PUT /patients/:patientId/diary/:entryId endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/patient-diary.ts'
    symbol: 'router'
    line_start: '97'
    line_end: '137'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/patient-diary.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.patientdiaryentry'
    evidence: 'backend/src/routes/patient-diary.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'put'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `api.backend.put-patients-by-param-diary-by-param-88` represent in ClinicOS?

## Canonical Definition

api.backend.put-patients-by-param-diary-by-param-88 is the canonical api-endpoint named PUT /patients/:patientId/diary/:entryId.

## Inputs

- Method: `PUT`
- Path: `/patients/:patientId/diary/:entryId`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patientDiaryEntry.findFirst","prisma.patientDiaryEntry.update"]`
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

- `backend/src/routes/patient-diary.ts:97-137` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.patientdiaryentry`
