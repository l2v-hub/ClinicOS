---
id: "component.frontend.frontend.src.types.appuntamento"
kind: "typescript-interface"
title: "Appuntamento"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "Appuntamento"
    line_start: "171"
    line_end: "185"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.types.appuntamento` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.appuntamento is the canonical typescript-interface named Appuntamento.

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
- `frontend/src/components/admin/AdminAgenda.tsx`
- `frontend/src/components/operator/OperatorAgenda.tsx`
- `frontend/src/components/shared/AppointmentForm.tsx`
- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `Appuntamento`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:171-185` — Appuntamento

## Related Knowledge

- `belongs-to` → `project.frontend`
