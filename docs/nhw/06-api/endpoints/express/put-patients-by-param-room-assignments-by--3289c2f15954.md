---
id: 'api.backend.put-patients-by-param-room-assignments-by-param-15'
kind: 'api-endpoint'
title: 'PUT /patients/:patientId/room-assignments/:assignmentId'
status: 'observed'
summary: 'PUT /patients/:patientId/room-assignments/:assignmentId endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/admin-rooms.ts'
    symbol: 'patientAssignmentRouter'
    line_start: '605'
    line_end: '640'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/admin-rooms.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.patientroomassignment'
    evidence: 'backend/src/routes/admin-rooms.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'put'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `api.backend.put-patients-by-param-room-assignments-by-param-15` represent in ClinicOS?

## Canonical Definition

api.backend.put-patients-by-param-room-assignments-by-param-15 is the canonical api-endpoint named PUT /patients/:patientId/room-assignments/:assignmentId.

## Inputs

- Method: `PUT`
- Path: `/patients/:patientId/room-assignments/:assignmentId`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patientRoomAssignment.findFirst","prisma.patientRoomAssignment.update"]`
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

- `backend/src/routes/admin-rooms.ts:605-640` — patientAssignmentRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.patientroomassignment`
