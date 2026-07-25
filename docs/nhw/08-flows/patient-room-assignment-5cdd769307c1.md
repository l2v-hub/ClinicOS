---
id: 'flow.patient-room-assignment'
kind: 'runtime-flow'
title: 'Patient room and bed assignment'
status: 'inferred'
summary: 'Patient room and bed assignment workflow across ClinicOS components.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/admin-rooms.ts'
    line_start: '458'
    line_end: '485'
    confidence: 'observed'
  - path: 'backend/src/routes/admin-rooms.ts'
    line_start: '293'
    line_end: '325'
    confidence: 'observed'
  - path: 'backend/src/routes/admin-rooms.ts'
    line_start: '643'
    line_end: '662'
    confidence: 'observed'
  - path: 'backend/src/routes/admin-rooms.ts'
    line_start: '90'
    line_end: '128'
    confidence: 'observed'
  - path: 'backend/src/routes/admin-rooms.ts'
    line_start: '131'
    line_end: '142'
    confidence: 'observed'
  - path: 'backend/src/routes/admin-rooms.ts'
    line_start: '205'
    line_end: '221'
    confidence: 'observed'
  - path: 'backend/src/routes/admin-rooms.ts'
    line_start: '332'
    line_end: '356'
    confidence: 'observed'
  - path: 'backend/src/routes/admin-rooms.ts'
    line_start: '43'
    line_end: '87'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-admin-beds-by-param-12'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-admin-rooms-by-param-8'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-patients-by-param-room-assignments-by-param-16'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.get-admin-beds-available-3'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.get-admin-rooms-4'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.get-admin-rooms-by-param-6'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.get-admin-rooms-by-param-beds-9'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.get-admin-rooms-occupancy-2'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts'
    confidence: 'inferred'
tags:
  - 'runtime-flow'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
inference_rule: 'Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence.'
---

## Question Answered

What does `flow.patient-room-assignment` represent in ClinicOS?

## Canonical Definition

flow.patient-room-assignment is the canonical runtime-flow named Patient room and bed assignment.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `api.backend.delete-admin-beds-by-param-12`
- `api.backend.delete-admin-rooms-by-param-8`
- `api.backend.delete-patients-by-param-room-assignments-by-param-16`
- `api.backend.get-admin-beds-available-3`
- `api.backend.get-admin-rooms-4`
- `api.backend.get-admin-rooms-by-param-6`
- `api.backend.get-admin-rooms-by-param-beds-9`
- `api.backend.get-admin-rooms-occupancy-2`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/routes/admin-rooms.ts:458-485`
- `backend/src/routes/admin-rooms.ts:293-325`
- `backend/src/routes/admin-rooms.ts:643-662`
- `backend/src/routes/admin-rooms.ts:90-128`
- `backend/src/routes/admin-rooms.ts:131-142`
- `backend/src/routes/admin-rooms.ts:205-221`
- `backend/src/routes/admin-rooms.ts:332-356`
- `backend/src/routes/admin-rooms.ts:43-87`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `api.backend.delete-admin-beds-by-param-12`
- `invokes` → `api.backend.delete-admin-rooms-by-param-8`
- `invokes` → `api.backend.delete-patients-by-param-room-assignments-by-param-16`
- `invokes` → `api.backend.get-admin-beds-available-3`
- `invokes` → `api.backend.get-admin-rooms-4`
- `invokes` → `api.backend.get-admin-rooms-by-param-6`
- `invokes` → `api.backend.get-admin-rooms-by-param-beds-9`
- `invokes` → `api.backend.get-admin-rooms-occupancy-2`

## Sequence

| Step | Actor            | Operation                                                           | State change               | Failure branch                  |
| ---- | ---------------- | ------------------------------------------------------------------- | -------------------------- | ------------------------------- |
| 1    | Trigger actor    | `api.backend.delete-admin-beds-by-param-12`                         | Defined by cited component | Owning component error contract |
| 2    | ClinicOS runtime | `api.backend.delete-admin-rooms-by-param-8`                         | Defined by cited component | Owning component error contract |
| 3    | ClinicOS runtime | `api.backend.delete-patients-by-param-room-assignments-by-param-16` | Defined by cited component | Owning component error contract |
| 4    | ClinicOS runtime | `api.backend.get-admin-beds-available-3`                            | Defined by cited component | Owning component error contract |
| 5    | ClinicOS runtime | `api.backend.get-admin-rooms-4`                                     | Defined by cited component | Owning component error contract |
| 6    | ClinicOS runtime | `api.backend.get-admin-rooms-by-param-6`                            | Defined by cited component | Owning component error contract |
| 7    | ClinicOS runtime | `api.backend.get-admin-rooms-by-param-beds-9`                       | Defined by cited component | Owning component error contract |
| 8    | ClinicOS runtime | `api.backend.get-admin-rooms-occupancy-2`                           | Defined by cited component | Owning component error contract |
