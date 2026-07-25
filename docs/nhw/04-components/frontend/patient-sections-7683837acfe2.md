---
id: "component.frontend.frontend.src.components.operator.sections.patientsections.patient-sections"
kind: "typescript-constant"
title: "PATIENT_SECTIONS"
status: "observed"
summary: "Exported constant from frontend/src/components/operator/sections/patientSections.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/sections/patientSections.ts"
    symbol: "PATIENT_SECTIONS"
    line_start: "10"
    line_end: "65"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/sections/patientSections.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.sections.patientsections.patient-sections` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.sections.patientsections.patient-sections is the canonical typescript-constant named PATIENT_SECTIONS.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/sections/__tests__/patientSections.test.ts`

## Invariants

The symbol is exported across its module boundary as `PATIENT_SECTIONS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/sections/patientSections.ts:10-65` — PATIENT_SECTIONS

## Related Knowledge

- `belongs-to` → `project.frontend`
