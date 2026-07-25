---
id: "component.frontend.frontend.src.components.shared.intake.intakedraftapi.getdraft"
kind: "typescript-function"
title: "getDraft"
status: "observed"
summary: "Exported function from frontend/src/components/shared/intake/intakeDraftApi.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/intake/intakeDraftApi.ts"
    symbol: "getDraft"
    line_start: "81"
    line_end: "91"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/intake/intakeDraftApi.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.intakedraftapi.getdraft` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.intakedraftapi.getdraft is the canonical typescript-function named getDraft.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/intake/IntakeWorkspace.tsx`

## Invariants

The symbol is exported across its module boundary as `getDraft`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/intakeDraftApi.ts:81-91` — getDraft

## Related Knowledge

- `belongs-to` → `project.frontend`
