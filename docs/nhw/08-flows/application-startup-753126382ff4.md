---
id: 'flow.application-startup'
kind: 'runtime-flow'
title: 'Application startup and shutdown'
status: 'inferred'
summary: 'Application startup and shutdown workflow across ClinicOS components.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/server.ts'
    symbol: 'DEFAULT_PORT'
    line_start: '6'
    line_end: '6'
    confidence: 'observed'
  - path: 'backend/src/server.ts'
    symbol: 'parsePort'
    line_start: '8'
    line_end: '20'
    confidence: 'observed'
  - path: 'backend/src/server.ts'
    symbol: 'port'
    line_start: '22'
    line_end: '22'
    confidence: 'observed'
  - path: 'backend/src/server.ts'
    symbol: 'server'
    line_start: '24'
    line_end: '45'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'backend/src/server.ts,backend/src/server.ts,backend/src/server.ts,backend/src/server.ts'
    confidence: 'inferred'
tags:
  - 'runtime-flow'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
inference_rule: 'Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence.'
---

## Question Answered

What does `flow.application-startup` represent in ClinicOS?

## Canonical Definition

flow.application-startup is the canonical runtime-flow named Application startup and shutdown.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/server.ts:6-6` — DEFAULT_PORT
- `backend/src/server.ts:8-20` — parsePort
- `backend/src/server.ts:22-22` — port
- `backend/src/server.ts:24-45` — server

## Related Knowledge

- `belongs-to` → `system.clinicos`

## Sequence

| Step | Actor            | Operation                                           | State change               | Failure branch                  |
| ---- | ---------------- | --------------------------------------------------- | -------------------------- | ------------------------------- |
| 1    | Trigger actor    | `component.backend.backend.src.server.default-port` | Defined by cited component | Owning component error contract |
| 2    | ClinicOS runtime | `component.backend.backend.src.server.parseport`    | Defined by cited component | Owning component error contract |
| 3    | ClinicOS runtime | `component.backend.backend.src.server.port`         | Defined by cited component | Owning component error contract |
| 4    | ClinicOS runtime | `component.backend.backend.src.server.server`       | Defined by cited component | Owning component error contract |
