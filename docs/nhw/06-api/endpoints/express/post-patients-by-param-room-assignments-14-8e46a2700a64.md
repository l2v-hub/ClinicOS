---
id: 'api.backend.post-patients-by-param-room-assignments-14'
kind: 'api-endpoint'
title: 'POST /patients/:patientId/room-assignments'
status: 'observed'
summary: 'POST /patients/:patientId/room-assignments endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/admin-rooms.ts'
    symbol: 'patientAssignmentRouter'
    line_start: '518'
    line_end: '602'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/admin-rooms.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.bed'
    evidence: 'backend/src/routes/admin-rooms.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.patient'
    evidence: 'backend/src/routes/admin-rooms.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.patientroomassignment'
    evidence: 'backend/src/routes/admin-rooms.ts'
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

What does `api.backend.post-patients-by-param-room-assignments-14` represent in ClinicOS?

## Canonical Definition

api.backend.post-patients-by-param-room-assignments-14 is the canonical api-endpoint named POST /patients/:patientId/room-assignments.

## Inputs

- Method: `POST`
- Path: `/patients/:patientId/room-assignments`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,400,404,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.bed.findUnique","prisma.patient.findUnique","prisma.patientRoomAssignment.create","prisma.patientRoomAssignment.findFirst","prisma.patientRoomAssignment.findMany","prisma.patientRoomAssignment.update"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[400,404,409,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/admin-rooms.ts:518-602` — patientAssignmentRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.bed`
- `writes` → `data.model.patient`
- `writes` → `data.model.patientroomassignment`
