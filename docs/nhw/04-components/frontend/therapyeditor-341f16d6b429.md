---
id: "component.frontend.frontend.src.components.operator.sections.therapyeditor.therapyeditor"
kind: "typescript-react-component"
title: "TherapyEditor"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/sections/TherapyEditor.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/sections/TherapyEditor.tsx"
    symbol: "TherapyEditor"
    line_start: "17"
    line_end: "41"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/sections/TherapyEditor.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.sections.therapyeditor.therapyeditor` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.sections.therapyeditor.therapyeditor is the canonical typescript-react-component named TherapyEditor.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/operator/sections/patientSections.ts`

## Invariants

The symbol is exported across its module boundary as `TherapyEditor`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/sections/TherapyEditor.tsx:17-41` — TherapyEditor

## Related Knowledge

- `belongs-to` → `project.frontend`
