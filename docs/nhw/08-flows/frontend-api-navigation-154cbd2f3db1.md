---
id: "flow.frontend-api-navigation"
kind: "runtime-flow"
title: "Frontend navigation and API error handling"
status: "inferred"
summary: "Frontend navigation and API error handling workflow across ClinicOS components."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/App.tsx"
    symbol: "App"
    line_start: "130"
    line_end: "1597"
    confidence: "observed"
  - path: "frontend/src/App.tsx"
    symbol: "mapAppointmentDTO"
    line_start: "105"
    line_end: "126"
    confidence: "observed"
  - path: "frontend/src/App.tsx"
    symbol: "MODULE_TAB_IDS"
    line_start: "52"
    line_end: "59"
    confidence: "observed"
  - path: "frontend/src/App.tsx"
    symbol: "NAV_FALLBACK"
    line_start: "78"
    line_end: "86"
    confidence: "observed"
  - path: "frontend/src/App.tsx"
    symbol: "NAV_LABELS"
    line_start: "61"
    line_end: "76"
    confidence: "observed"
  - path: "frontend/src/App.tsx"
    symbol: "TIPI_NOTI"
    line_start: "95"
    line_end: "103"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "frontend/src/App.tsx,frontend/src/App.tsx,frontend/src/App.tsx,frontend/src/App.tsx,frontend/src/App.tsx,frontend/src/App.tsx"
    confidence: "inferred"
  - type: "invokes"
    target: "component.frontend.frontend.src.app.app"
    evidence: "frontend/src/App.tsx,frontend/src/App.tsx,frontend/src/App.tsx,frontend/src/App.tsx,frontend/src/App.tsx,frontend/src/App.tsx"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.frontend-api-navigation` represent in ClinicOS?

## Canonical Definition

flow.frontend-api-navigation is the canonical runtime-flow named Frontend navigation and API error handling.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `component.frontend.frontend.src.app.app`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `frontend/src/App.tsx:130-1597` — App
- `frontend/src/App.tsx:105-126` — mapAppointmentDTO
- `frontend/src/App.tsx:52-59` — MODULE_TAB_IDS
- `frontend/src/App.tsx:78-86` — NAV_FALLBACK
- `frontend/src/App.tsx:61-76` — NAV_LABELS
- `frontend/src/App.tsx:95-103` — TIPI_NOTI

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `component.frontend.frontend.src.app.app`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `component.frontend.frontend.src.app.app` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `component.frontend.frontend.src.app.mapappointmentdto` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `component.frontend.frontend.src.app.module-tab-ids` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `component.frontend.frontend.src.app.nav-fallback` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `component.frontend.frontend.src.app.nav-labels` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `component.frontend.frontend.src.app.tipi-noti` | Defined by cited component | Owning component error contract |
