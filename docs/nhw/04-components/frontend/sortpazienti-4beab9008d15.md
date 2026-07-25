---
id: "component.frontend.frontend.src.lib.patientsort.sortpazienti"
kind: "typescript-function"
title: "sortPazienti"
status: "observed"
summary: "Exported function from frontend/src/lib/patientSort.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "frontend/src/lib/patientSort.ts"
    symbol: "sortPazienti"
    line_start: "48"
    line_end: "52"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/patientSort.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.lib.patientsort.sortpazienti` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.patientsort.sortpazienti is the canonical typescript-function named sortPazienti.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`
- `frontend/src/components/operator/TherapySlotModal.tsx`

## Invariants

The symbol is exported across its module boundary as `sortPazienti`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/patientSort.ts:48-52` — sortPazienti

## Related Knowledge

- `belongs-to` → `project.frontend`
