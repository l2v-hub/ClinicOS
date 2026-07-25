---
id: 'api.backend.post-therapy-slots-not-administered-114'
kind: 'api-endpoint'
title: 'POST /therapy-slots/not-administered'
status: 'observed'
summary: 'POST /therapy-slots/not-administered endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.therapy-administration'
sources:
  - path: 'backend/src/routes/therapy.ts'
    symbol: 'router'
    line_start: '284'
    line_end: '354'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/therapy.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.medicationadministration'
    evidence: 'backend/src/routes/therapy.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'post'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `api.backend.post-therapy-slots-not-administered-114` represent in ClinicOS?

## Canonical Definition

api.backend.post-therapy-slots-not-administered-114 is the canonical api-endpoint named POST /therapy-slots/not-administered.

## Inputs

- Method: `POST`
- Path: `/therapy-slots/not-administered`
- Request inputs: `["req.body"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,400,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.medicationAdministration.upsert"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[400,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/therapy.ts:284-354` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.medicationadministration`
