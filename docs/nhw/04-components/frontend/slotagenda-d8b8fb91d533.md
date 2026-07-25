---
id: "component.frontend.frontend.src.types.slotagenda"
kind: "typescript-interface"
title: "SlotAgenda"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "SlotAgenda"
    line_start: "156"
    line_end: "163"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.types.slotagenda` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.slotagenda is the canonical typescript-interface named SlotAgenda.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `SlotAgenda`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:156-163` — SlotAgenda

## Related Knowledge

- `belongs-to` → `project.frontend`
