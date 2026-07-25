---
id: "component.frontend.frontend.src.components.operator.sections.types.sectionprops"
kind: "typescript-interface"
title: "SectionProps"
status: "observed"
summary: "Exported interface from frontend/src/components/operator/sections/types.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/sections/types.ts"
    symbol: "SectionProps"
    line_start: "7"
    line_end: "13"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/sections/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.sections.types.sectionprops` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.sections.types.sectionprops is the canonical typescript-interface named SectionProps.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/sections/AllergiesEditor.tsx`
- `frontend/src/components/operator/sections/AnamnesisEditor.tsx`
- `frontend/src/components/operator/sections/DiagnosisEditor.tsx`
- `frontend/src/components/operator/sections/PainAssessmentEditor.tsx`
- `frontend/src/components/operator/sections/PatientSection.tsx`
- `frontend/src/components/operator/sections/TherapyEditor.tsx`
- `frontend/src/components/operator/sections/VitalSignsEditor.tsx`
- `frontend/src/components/operator/sections/patientSections.ts`
- `frontend/src/components/shared/intake/StepClinica.tsx`

## Invariants

The symbol is exported across its module boundary as `SectionProps`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/sections/types.ts:7-13` — SectionProps

## Related Knowledge

- `belongs-to` → `project.frontend`
