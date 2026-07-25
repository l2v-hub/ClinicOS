---
id: "component.frontend.frontend.src.types.prioritaconsegna"
kind: "typescript-type-alias"
title: "PrioritaConsegna"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "frontend/src/types.ts"
    symbol: "PrioritaConsegna"
    line_start: "134"
    line_end: "134"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.types.prioritaconsegna` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.prioritaconsegna is the canonical typescript-type-alias named PrioritaConsegna.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/ConsegnePage.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `PrioritaConsegna`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:134-134` — PrioritaConsegna

## Related Knowledge

- `belongs-to` → `project.frontend`
