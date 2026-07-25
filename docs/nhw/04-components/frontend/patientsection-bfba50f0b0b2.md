---
id: "component.frontend.frontend.src.components.operator.sections.patientsection.patientsection"
kind: "typescript-react-component"
title: "PatientSection"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/sections/PatientSection.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/sections/PatientSection.tsx"
    symbol: "PatientSection"
    line_start: "11"
    line_end: "21"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/sections/PatientSection.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.sections.patientsection.patientsection` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.sections.patientsection.patientsection is the canonical typescript-react-component named PatientSection.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `PatientSection`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/sections/PatientSection.tsx:11-21` — PatientSection

## Related Knowledge

- `belongs-to` → `project.frontend`
