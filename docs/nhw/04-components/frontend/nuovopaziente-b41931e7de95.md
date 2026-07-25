---
id: "component.frontend.frontend.src.types.nuovopaziente"
kind: "typescript-interface"
title: "NuovoPaziente"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "NuovoPaziente"
    line_start: "48"
    line_end: "95"
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

What does `component.frontend.frontend.src.types.nuovopaziente` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.nuovopaziente is the canonical typescript-interface named NuovoPaziente.

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
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/components/shared/DischargeLetterImport.tsx`
- `frontend/src/components/shared/NewPatientModal.tsx`

## Invariants

The symbol is exported across its module boundary as `NuovoPaziente`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:48-95` — NuovoPaziente

## Related Knowledge

- `belongs-to` → `project.frontend`
