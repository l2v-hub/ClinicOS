---
id: "component.frontend.frontend.src.components.operator.sections.anamnesiseditor.anamnesiseditor"
kind: "typescript-react-component"
title: "AnamnesisEditor"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/sections/AnamnesisEditor.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/sections/AnamnesisEditor.tsx"
    symbol: "AnamnesisEditor"
    line_start: "51"
    line_end: "186"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/sections/AnamnesisEditor.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.sections.anamnesiseditor.anamnesiseditor` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.sections.anamnesiseditor.anamnesiseditor is the canonical typescript-react-component named AnamnesisEditor.

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

The symbol is exported across its module boundary as `AnamnesisEditor`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/sections/AnamnesisEditor.tsx:51-186` — AnamnesisEditor

## Related Knowledge

- `belongs-to` → `project.frontend`
