---
id: "api.backend.delete-patients-by-param-room-assignments-by-param-16"
kind: "api-endpoint"
title: "DELETE /patients/:patientId/room-assignments/:assignmentId"
status: "observed"
summary: "DELETE /patients/:patientId/room-assignments/:assignmentId endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "patientAssignmentRouter"
    line_start: "643"
    line_end: "662"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.patientroomassignment"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "delete"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `api.backend.delete-patients-by-param-room-assignments-by-param-16` represent in ClinicOS?

## Canonical Definition

api.backend.delete-patients-by-param-room-assignments-by-param-16 is the canonical api-endpoint named DELETE /patients/:patientId/room-assignments/:assignmentId.

## Inputs

- Method: `DELETE`
- Path: `/patients/:patientId/room-assignments/:assignmentId`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[204,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patientRoomAssignment.delete","prisma.patientRoomAssignment.findFirst"]`
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

- `backend/src/routes/admin-rooms.ts:643-662` — patientAssignmentRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.patientroomassignment`
