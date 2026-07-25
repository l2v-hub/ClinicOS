---
id: "component.frontend.frontend.src.types.motivononerogazione"
kind: "typescript-type-alias"
title: "MotivoNonErogazione"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "MotivoNonErogazione"
    line_start: "926"
    line_end: "932"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.types.motivononerogazione` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.motivononerogazione is the canonical typescript-type-alias named MotivoNonErogazione.

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
- `frontend/src/components/operator/OperatorAgenda.tsx`
- `frontend/src/components/operator/TherapySlotModal.tsx`

## Invariants

The symbol is exported across its module boundary as `MotivoNonErogazione`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:926-932` — MotivoNonErogazione

## Related Knowledge

- `belongs-to` → `project.frontend`
