---
id: 'flow.build-test-migrate-deploy'
kind: 'runtime-flow'
title: 'Build, test, migration, deployment, and health checks'
status: 'inferred'
summary: 'Build, test, migration, deployment, and health checks workflow across ClinicOS components.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/routes/admin-rooms.ts'
    line_start: '458'
    line_end: '485'
    confidence: 'observed'
  - path: 'backend/src/routes/admin-rooms.ts'
    line_start: '293'
    line_end: '325'
    confidence: 'observed'
  - path: 'backend/src/routes/ai-jobs.ts'
    line_start: '116'
    line_end: '123'
    confidence: 'observed'
  - path: 'backend/src/routes/appointments.ts'
    line_start: '125'
    line_end: '140'
    confidence: 'observed'
  - path: 'backend/src/routes/consegne.ts'
    line_start: '107'
    line_end: '122'
    confidence: 'observed'
  - path: 'backend/src/routes/note.ts'
    line_start: '98'
    line_end: '113'
    confidence: 'observed'
  - path: 'backend/src/routes/patients.ts'
    line_start: '889'
    line_end: '914'
    confidence: 'observed'
  - path: 'backend/src/routes/patient-diary.ts'
    line_start: '140'
    line_end: '156'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-jobs.ts,backend/src/routes/appointments.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-admin-beds-by-param-12'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-jobs.ts,backend/src/routes/appointments.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-admin-rooms-by-param-8'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-jobs.ts,backend/src/routes/appointments.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-ai-extraction-jobs-by-param-files-by-param-28'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-jobs.ts,backend/src/routes/appointments.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-appointments-by-param-44'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-jobs.ts,backend/src/routes/appointments.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-consegne-by-param-48'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-jobs.ts,backend/src/routes/appointments.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-notes-by-param-79'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-jobs.ts,backend/src/routes/appointments.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-patients-by-param-109'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-jobs.ts,backend/src/routes/appointments.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-patients-by-param-diary-by-param-89'
    evidence: 'backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/ai-jobs.ts,backend/src/routes/appointments.ts,backend/src/routes/consegne.ts,backend/src/routes/note.ts,backend/src/routes/patients.ts,backend/src/routes/patient-diary.ts'
    confidence: 'inferred'
tags:
  - 'runtime-flow'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
inference_rule: 'Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence.'
---

## Question Answered

What does `flow.build-test-migrate-deploy` represent in ClinicOS?

## Canonical Definition

flow.build-test-migrate-deploy is the canonical runtime-flow named Build, test, migration, deployment, and health checks.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `api.backend.delete-admin-beds-by-param-12`
- `api.backend.delete-admin-rooms-by-param-8`
- `api.backend.delete-ai-extraction-jobs-by-param-files-by-param-28`
- `api.backend.delete-appointments-by-param-44`
- `api.backend.delete-consegne-by-param-48`
- `api.backend.delete-notes-by-param-79`
- `api.backend.delete-patients-by-param-109`
- `api.backend.delete-patients-by-param-diary-by-param-89`

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
- `backend/src/routes/ai-jobs.ts:116-123`
- `backend/src/routes/appointments.ts:125-140`
- `backend/src/routes/consegne.ts:107-122`
- `backend/src/routes/note.ts:98-113`
- `backend/src/routes/patients.ts:889-914`
- `backend/src/routes/patient-diary.ts:140-156`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `api.backend.delete-admin-beds-by-param-12`
- `invokes` → `api.backend.delete-admin-rooms-by-param-8`
- `invokes` → `api.backend.delete-ai-extraction-jobs-by-param-files-by-param-28`
- `invokes` → `api.backend.delete-appointments-by-param-44`
- `invokes` → `api.backend.delete-consegne-by-param-48`
- `invokes` → `api.backend.delete-notes-by-param-79`
- `invokes` → `api.backend.delete-patients-by-param-109`
- `invokes` → `api.backend.delete-patients-by-param-diary-by-param-89`

## Sequence

| Step | Actor            | Operation                                                          | State change               | Failure branch                  |
| ---- | ---------------- | ------------------------------------------------------------------ | -------------------------- | ------------------------------- |
| 1    | Trigger actor    | `api.backend.delete-admin-beds-by-param-12`                        | Defined by cited component | Owning component error contract |
| 2    | ClinicOS runtime | `api.backend.delete-admin-rooms-by-param-8`                        | Defined by cited component | Owning component error contract |
| 3    | ClinicOS runtime | `api.backend.delete-ai-extraction-jobs-by-param-files-by-param-28` | Defined by cited component | Owning component error contract |
| 4    | ClinicOS runtime | `api.backend.delete-appointments-by-param-44`                      | Defined by cited component | Owning component error contract |
| 5    | ClinicOS runtime | `api.backend.delete-consegne-by-param-48`                          | Defined by cited component | Owning component error contract |
| 6    | ClinicOS runtime | `api.backend.delete-notes-by-param-79`                             | Defined by cited component | Owning component error contract |
| 7    | ClinicOS runtime | `api.backend.delete-patients-by-param-109`                         | Defined by cited component | Owning component error contract |
| 8    | ClinicOS runtime | `api.backend.delete-patients-by-param-diary-by-param-89`           | Defined by cited component | Owning component error contract |
