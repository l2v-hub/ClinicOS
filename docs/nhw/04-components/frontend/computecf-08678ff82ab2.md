---
id: "component.frontend.frontend.src.lib.codicefiscale.computecf"
kind: "typescript-function"
title: "computeCF"
status: "observed"
summary: "Exported function from frontend/src/lib/codiceFiscale.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/lib/codiceFiscale.ts"
    symbol: "computeCF"
    line_start: "34"
    line_end: "68"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/codiceFiscale.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.lib.codicefiscale.computecf` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.codicefiscale.computecf is the canonical typescript-function named computeCF.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/NewPatientModal.tsx`
- `frontend/src/components/shared/intake/StepAnagrafica.tsx`

## Invariants

The symbol is exported across its module boundary as `computeCF`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/codiceFiscale.ts:34-68` — computeCF

## Related Knowledge

- `belongs-to` → `project.frontend`
