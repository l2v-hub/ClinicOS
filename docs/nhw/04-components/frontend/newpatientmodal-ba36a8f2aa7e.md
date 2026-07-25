---
id: "component.frontend.frontend.src.components.shared.newpatientmodal.newpatientmodal"
kind: "typescript-react-component"
title: "NewPatientModal"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/NewPatientModal.tsx."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "frontend/src/components/shared/NewPatientModal.tsx"
    symbol: "NewPatientModal"
    line_start: "141"
    line_end: "939"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/NewPatientModal.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.newpatientmodal.newpatientmodal` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.newpatientmodal.newpatientmodal is the canonical typescript-react-component named NewPatientModal.

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

The symbol is exported across its module boundary as `NewPatientModal`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/NewPatientModal.tsx:141-939` — NewPatientModal

## Related Knowledge

- `belongs-to` → `project.frontend`
