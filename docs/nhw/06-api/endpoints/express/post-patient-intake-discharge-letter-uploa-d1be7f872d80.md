---
id: 'api.backend.post-patient-intake-discharge-letter-upload-93'
kind: 'api-endpoint'
title: 'POST /patient-intake/discharge-letter/upload'
status: 'observed'
summary: 'POST /patient-intake/discharge-letter/upload endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/patient-intake.ts'
    symbol: 'router'
    line_start: '8'
    line_end: '37'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/patient-intake.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.patientintakedocument'
    evidence: 'backend/src/routes/patient-intake.ts'
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

What does `api.backend.post-patient-intake-discharge-letter-upload-93` represent in ClinicOS?

## Canonical Definition

api.backend.post-patient-intake-discharge-letter-upload-93 is the canonical api-endpoint named POST /patient-intake/discharge-letter/upload.

## Inputs

- Method: `POST`
- Path: `/patient-intake/discharge-letter/upload`
- Request inputs: `["req.body"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,400,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patientIntakeDocument.create"]`
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

- `backend/src/routes/patient-intake.ts:8-37` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.patientintakedocument`
