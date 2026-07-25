---
id: "component.frontend.frontend.src.types.consegna"
kind: "typescript-interface"
title: "Consegna"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "frontend/src/types.ts"
    symbol: "Consegna"
    line_start: "137"
    line_end: "150"
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

What does `component.frontend.frontend.src.types.consegna` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.consegna is the canonical typescript-interface named Consegna.

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
- `frontend/src/components/admin/AdminDashboard.tsx`
- `frontend/src/components/operator/ConsegnePage.tsx`
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `Consegna`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:137-150` — Consegna

## Related Knowledge

- `belongs-to` → `project.frontend`
