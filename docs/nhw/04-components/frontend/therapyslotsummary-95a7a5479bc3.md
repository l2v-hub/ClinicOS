---
id: "component.frontend.frontend.src.types.therapyslotsummary"
kind: "typescript-interface"
title: "TherapySlotSummary"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "frontend/src/types.ts"
    symbol: "TherapySlotSummary"
    line_start: "957"
    line_end: "962"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.types.therapyslotsummary` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.therapyslotsummary is the canonical typescript-interface named TherapySlotSummary.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `TherapySlotSummary`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:957-962` — TherapySlotSummary

## Related Knowledge

- `belongs-to` → `project.frontend`
