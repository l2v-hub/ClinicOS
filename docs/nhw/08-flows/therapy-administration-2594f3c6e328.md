---
id: 'flow.therapy-administration'
kind: 'runtime-flow'
title: 'Therapy scheduling and administration'
status: 'inferred'
summary: 'Therapy scheduling and administration workflow across ClinicOS components.'
bounded_contexts:
  - 'context.therapy-administration'
sources:
  - path: 'backend/src/routes/patient-therapies.ts'
    line_start: '169'
    line_end: '188'
    confidence: 'observed'
  - path: 'backend/src/routes/patient-therapies.ts'
    line_start: '191'
    line_end: '217'
    confidence: 'observed'
  - path: 'backend/src/routes/patient-therapies.ts'
    line_start: '18'
    line_end: '36'
    confidence: 'observed'
  - path: 'backend/src/routes/therapy.ts'
    line_start: '26'
    line_end: '192'
    confidence: 'observed'
  - path: 'backend/src/routes/internal-ai.ts'
    line_start: '102'
    line_end: '105'
    confidence: 'observed'
  - path: 'backend/src/routes/patient-therapies.ts'
    line_start: '39'
    line_end: '74'
    confidence: 'observed'
  - path: 'backend/src/routes/therapy.ts'
    line_start: '196'
    line_end: '280'
    confidence: 'observed'
  - path: 'backend/src/routes/therapy.ts'
    line_start: '284'
    line_end: '354'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/internal-ai.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/therapy.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.delete-patients-by-param-therapies-by-param-100'
    evidence: 'backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/internal-ai.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/therapy.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.get-patients-by-param-medication-administrations-101'
    evidence: 'backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/internal-ai.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/therapy.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.get-patients-by-param-therapies-97'
    evidence: 'backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/internal-ai.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/therapy.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.get-therapy-slots-112'
    evidence: 'backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/internal-ai.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/therapy.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.post-internal-ai-patient-therapies-67'
    evidence: 'backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/internal-ai.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/therapy.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.post-patients-by-param-therapies-98'
    evidence: 'backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/internal-ai.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/therapy.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.post-therapy-slots-confirm-113'
    evidence: 'backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/internal-ai.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/therapy.ts'
    confidence: 'inferred'
  - type: 'invokes'
    target: 'api.backend.post-therapy-slots-not-administered-114'
    evidence: 'backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/internal-ai.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts,backend/src/routes/therapy.ts'
    confidence: 'inferred'
tags:
  - 'runtime-flow'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
inference_rule: 'Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence.'
---

## Question Answered

What does `flow.therapy-administration` represent in ClinicOS?

## Canonical Definition

flow.therapy-administration is the canonical runtime-flow named Therapy scheduling and administration.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `api.backend.delete-patients-by-param-therapies-by-param-100`
- `api.backend.get-patients-by-param-medication-administrations-101`
- `api.backend.get-patients-by-param-therapies-97`
- `api.backend.get-therapy-slots-112`
- `api.backend.post-internal-ai-patient-therapies-67`
- `api.backend.post-patients-by-param-therapies-98`
- `api.backend.post-therapy-slots-confirm-113`
- `api.backend.post-therapy-slots-not-administered-114`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/routes/patient-therapies.ts:169-188`
- `backend/src/routes/patient-therapies.ts:191-217`
- `backend/src/routes/patient-therapies.ts:18-36`
- `backend/src/routes/therapy.ts:26-192`
- `backend/src/routes/internal-ai.ts:102-105`
- `backend/src/routes/patient-therapies.ts:39-74`
- `backend/src/routes/therapy.ts:196-280`
- `backend/src/routes/therapy.ts:284-354`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `api.backend.delete-patients-by-param-therapies-by-param-100`
- `invokes` → `api.backend.get-patients-by-param-medication-administrations-101`
- `invokes` → `api.backend.get-patients-by-param-therapies-97`
- `invokes` → `api.backend.get-therapy-slots-112`
- `invokes` → `api.backend.post-internal-ai-patient-therapies-67`
- `invokes` → `api.backend.post-patients-by-param-therapies-98`
- `invokes` → `api.backend.post-therapy-slots-confirm-113`
- `invokes` → `api.backend.post-therapy-slots-not-administered-114`

## Sequence

| Step | Actor            | Operation                                                          | State change               | Failure branch                  |
| ---- | ---------------- | ------------------------------------------------------------------ | -------------------------- | ------------------------------- |
| 1    | Trigger actor    | `api.backend.delete-patients-by-param-therapies-by-param-100`      | Defined by cited component | Owning component error contract |
| 2    | ClinicOS runtime | `api.backend.get-patients-by-param-medication-administrations-101` | Defined by cited component | Owning component error contract |
| 3    | ClinicOS runtime | `api.backend.get-patients-by-param-therapies-97`                   | Defined by cited component | Owning component error contract |
| 4    | ClinicOS runtime | `api.backend.get-therapy-slots-112`                                | Defined by cited component | Owning component error contract |
| 5    | ClinicOS runtime | `api.backend.post-internal-ai-patient-therapies-67`                | Defined by cited component | Owning component error contract |
| 6    | ClinicOS runtime | `api.backend.post-patients-by-param-therapies-98`                  | Defined by cited component | Owning component error contract |
| 7    | ClinicOS runtime | `api.backend.post-therapy-slots-confirm-113`                       | Defined by cited component | Owning component error contract |
| 8    | ClinicOS runtime | `api.backend.post-therapy-slots-not-administered-114`              | Defined by cited component | Owning component error contract |
