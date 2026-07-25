---
id: "component.frontend.frontend.src.lib.patientsort.comparepazienti"
kind: "typescript-function"
title: "comparePazienti"
status: "observed"
summary: "Exported function from frontend/src/lib/patientSort.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "frontend/src/lib/patientSort.ts"
    symbol: "comparePazienti"
    line_start: "19"
    line_end: "30"
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
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.lib.patientsort.comparepazienti` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.patientsort.comparepazienti is the canonical typescript-function named comparePazienti.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/MultiPatientParametri.tsx`

## Invariants

The symbol is exported across its module boundary as `comparePazienti`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/patientSort.ts:19-30` — comparePazienti

## Related Knowledge

- `belongs-to` → `project.frontend`
