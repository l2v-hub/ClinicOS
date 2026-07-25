---
id: "component.frontend.frontend.src.components.shared.intake.dischargetherapyreview.dischargetherapyreview"
kind: "typescript-react-component"
title: "DischargeTherapyReview"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/intake/DischargeTherapyReview.tsx."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "frontend/src/components/shared/intake/DischargeTherapyReview.tsx"
    symbol: "DischargeTherapyReview"
    line_start: "25"
    line_end: "103"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/intake/DischargeTherapyReview.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.dischargetherapyreview.dischargetherapyreview` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.dischargetherapyreview.dischargetherapyreview is the canonical typescript-react-component named DischargeTherapyReview.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/intake/StepClinica.tsx`

## Invariants

The symbol is exported across its module boundary as `DischargeTherapyReview`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/DischargeTherapyReview.tsx:25-103` — DischargeTherapyReview

## Related Knowledge

- `belongs-to` → `project.frontend`
