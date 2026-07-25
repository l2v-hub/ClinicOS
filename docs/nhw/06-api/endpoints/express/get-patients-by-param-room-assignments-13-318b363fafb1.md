---
id: "api.backend.get-patients-by-param-room-assignments-13"
kind: "api-endpoint"
title: "GET /patients/:patientId/room-assignments"
status: "observed"
summary: "GET /patients/:patientId/room-assignments endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "patientAssignmentRouter"
    line_start: "492"
    line_end: "515"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.patient"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.patientroomassignment"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `api.backend.get-patients-by-param-room-assignments-13` represent in ClinicOS?

## Canonical Definition

api.backend.get-patients-by-param-room-assignments-13 is the canonical api-endpoint named GET /patients/:patientId/room-assignments.

## Inputs

- Method: `GET`
- Path: `/patients/:patientId/room-assignments`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patient.findUnique","prisma.patientRoomAssignment.findMany"]`
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

- `backend/src/routes/admin-rooms.ts:492-515` — patientAssignmentRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.patient`
- `reads` → `data.model.patientroomassignment`
