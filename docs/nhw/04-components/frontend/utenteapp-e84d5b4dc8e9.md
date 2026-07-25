---
id: "component.frontend.frontend.src.types.utenteapp"
kind: "typescript-interface"
title: "UtenteApp"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "UtenteApp"
    line_start: "5"
    line_end: "11"
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

What does `component.frontend.frontend.src.types.utenteapp` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.utenteapp is the canonical typescript-interface named UtenteApp.

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
- `frontend/src/components/Login.tsx`
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/components/shared/TeamsLikeSidebar.tsx`
- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `UtenteApp`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:5-11` — UtenteApp

## Related Knowledge

- `belongs-to` → `project.frontend`
