---
id: 'api.backend.post-patients-demo-setup-106'
kind: 'api-endpoint'
title: 'POST /patients/demo-setup'
status: 'observed'
summary: 'POST /patients/demo-setup endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/patients.ts'
    symbol: 'router'
    line_start: '75'
    line_end: '716'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/patients.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.cartella'
    evidence: 'backend/src/routes/patients.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.patient'
    evidence: 'backend/src/routes/patients.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'post'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `api.backend.post-patients-demo-setup-106` represent in ClinicOS?

## Canonical Definition

api.backend.post-patients-demo-setup-106 is the canonical api-endpoint named POST /patients/demo-setup.

## Inputs

- Method: `POST`
- Path: `/patients/demo-setup`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.cartella.upsert","prisma.patient.create","prisma.patient.findFirst","prisma.patient.update"]`
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

- `backend/src/routes/patients.ts:75-716` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.cartella`
- `writes` → `data.model.patient`
