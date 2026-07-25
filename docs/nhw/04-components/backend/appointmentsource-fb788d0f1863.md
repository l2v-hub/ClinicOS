---
id: "component.backend.backend.src.ai.gateway.sources.appointmentsource"
kind: "typescript-function"
title: "appointmentSource"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/sources.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/ai/gateway/sources.ts"
    symbol: "appointmentSource"
    line_start: "61"
    line_end: "68"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/sources.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.sources.appointmentsource` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.sources.appointmentsource is the canonical typescript-function named appointmentSource.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/assistant/service.ts`
- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `appointmentSource`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/sources.ts:61-68` — appointmentSource

## Related Knowledge

- `belongs-to` → `project.backend`
