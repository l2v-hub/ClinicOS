---
id: "flow.appointment-scheduling"
kind: "runtime-flow"
title: "Appointments and operator schedules"
status: "inferred"
summary: "Appointments and operator schedules workflow across ClinicOS components."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/routes/appointments.ts"
    line_start: "125"
    line_end: "140"
    confidence: "observed"
  - path: "backend/src/routes/appointments.ts"
    line_start: "20"
    line_end: "39"
    confidence: "observed"
  - path: "backend/src/routes/appointments.ts"
    line_start: "91"
    line_end: "122"
    confidence: "observed"
  - path: "backend/src/routes/appointments.ts"
    line_start: "42"
    line_end: "88"
    confidence: "observed"
  - path: "backend/src/routes/internal-ai.ts"
    line_start: "71"
    line_end: "79"
    confidence: "observed"
  - path: "backend/src/ai/actions/appointments.ts"
    symbol: "AppointmentHit"
    line_start: "200"
    line_end: "203"
    confidence: "observed"
  - path: "backend/src/ai/actions/appointments.ts"
    symbol: "AppointmentLookupDeps"
    line_start: "205"
    line_end: "220"
    confidence: "observed"
  - path: "backend/src/ai/actions/appointments.ts"
    symbol: "AppointmentPlanContext"
    line_start: "104"
    line_end: "106"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/internal-ai.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.delete-appointments-by-param-44"
    evidence: "backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/internal-ai.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-appointments-41"
    evidence: "backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/internal-ai.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.patch-appointments-by-param-43"
    evidence: "backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/internal-ai.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-appointments-42"
    evidence: "backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/internal-ai.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-internal-ai-query-appointments-61"
    evidence: "backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/internal-ai.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.actions.appointments.appointmenthit"
    evidence: "backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/internal-ai.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.actions.appointments.appointmentlookupdeps"
    evidence: "backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/internal-ai.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.actions.appointments.appointmentplancontext"
    evidence: "backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/internal-ai.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts,backend/src/ai/actions/appointments.ts"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.appointment-scheduling` represent in ClinicOS?

## Canonical Definition

flow.appointment-scheduling is the canonical runtime-flow named Appointments and operator schedules.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `api.backend.delete-appointments-by-param-44`
- `api.backend.get-appointments-41`
- `api.backend.patch-appointments-by-param-43`
- `api.backend.post-appointments-42`
- `api.backend.post-internal-ai-query-appointments-61`
- `component.backend.backend.src.ai.actions.appointments.appointmenthit`
- `component.backend.backend.src.ai.actions.appointments.appointmentlookupdeps`
- `component.backend.backend.src.ai.actions.appointments.appointmentplancontext`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/routes/appointments.ts:125-140`
- `backend/src/routes/appointments.ts:20-39`
- `backend/src/routes/appointments.ts:91-122`
- `backend/src/routes/appointments.ts:42-88`
- `backend/src/routes/internal-ai.ts:71-79`
- `backend/src/ai/actions/appointments.ts:200-203` — AppointmentHit
- `backend/src/ai/actions/appointments.ts:205-220` — AppointmentLookupDeps
- `backend/src/ai/actions/appointments.ts:104-106` — AppointmentPlanContext

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `api.backend.delete-appointments-by-param-44`
- `invokes` → `api.backend.get-appointments-41`
- `invokes` → `api.backend.patch-appointments-by-param-43`
- `invokes` → `api.backend.post-appointments-42`
- `invokes` → `api.backend.post-internal-ai-query-appointments-61`
- `invokes` → `component.backend.backend.src.ai.actions.appointments.appointmenthit`
- `invokes` → `component.backend.backend.src.ai.actions.appointments.appointmentlookupdeps`
- `invokes` → `component.backend.backend.src.ai.actions.appointments.appointmentplancontext`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `api.backend.delete-appointments-by-param-44` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `api.backend.get-appointments-41` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `api.backend.patch-appointments-by-param-43` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `api.backend.post-appointments-42` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `api.backend.post-internal-ai-query-appointments-61` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `component.backend.backend.src.ai.actions.appointments.appointmenthit` | Defined by cited component | Owning component error contract |
| 7 | ClinicOS runtime | `component.backend.backend.src.ai.actions.appointments.appointmentlookupdeps` | Defined by cited component | Owning component error contract |
| 8 | ClinicOS runtime | `component.backend.backend.src.ai.actions.appointments.appointmentplancontext` | Defined by cited component | Owning component error contract |
