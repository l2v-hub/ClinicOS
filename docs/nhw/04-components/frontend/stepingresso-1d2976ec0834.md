---
id: "component.frontend.frontend.src.components.shared.intake.stepingresso.stepingresso"
kind: "typescript-react-component"
title: "StepIngresso"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/intake/StepIngresso.tsx."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/intake/StepIngresso.tsx"
    symbol: "StepIngresso"
    line_start: "82"
    line_end: "185"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/intake/StepIngresso.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.stepingresso.stepingresso` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.stepingresso.stepingresso is the canonical typescript-react-component named StepIngresso.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/intake/IntakeWorkspace.tsx`

## Invariants

The symbol is exported across its module boundary as `StepIngresso`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/StepIngresso.tsx:82-185` — StepIngresso

## Related Knowledge

- `belongs-to` → `project.frontend`
