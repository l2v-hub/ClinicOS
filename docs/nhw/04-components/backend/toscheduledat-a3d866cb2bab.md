---
id: "component.backend.backend.src.services.appointment-service.toscheduledat"
kind: "typescript-function"
title: "toScheduledAt"
status: "observed"
summary: "Exported function from backend/src/services/appointment-service.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/services/appointment-service.ts"
    symbol: "toScheduledAt"
    line_start: "68"
    line_end: "72"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/services/appointment-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.services.appointment-service.toscheduledat` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.appointment-service.toscheduledat is the canonical typescript-function named toScheduledAt.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `toScheduledAt`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/appointment-service.ts:68-72` — toScheduledAt

## Related Knowledge

- `belongs-to` → `project.backend`
