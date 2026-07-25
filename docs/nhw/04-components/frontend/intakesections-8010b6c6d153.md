---
id: "component.frontend.frontend.src.components.operator.sections.patientsections.intakesections"
kind: "typescript-function"
title: "intakeSections"
status: "observed"
summary: "Exported function from frontend/src/components/operator/sections/patientSections.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/sections/patientSections.ts"
    symbol: "intakeSections"
    line_start: "67"
    line_end: "69"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/sections/patientSections.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.sections.patientsections.intakesections` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.sections.patientsections.intakesections is the canonical typescript-function named intakeSections.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/sections/__tests__/patientSections.test.ts`
- `frontend/src/components/shared/intake/StepClinica.tsx`

## Invariants

The symbol is exported across its module boundary as `intakeSections`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/sections/patientSections.ts:67-69` — intakeSections

## Related Knowledge

- `belongs-to` → `project.frontend`
