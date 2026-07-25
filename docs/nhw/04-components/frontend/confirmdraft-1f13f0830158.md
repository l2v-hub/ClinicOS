---
id: "component.frontend.frontend.src.components.shared.intake.intakedraftapi.confirmdraft"
kind: "typescript-function"
title: "confirmDraft"
status: "observed"
summary: "Exported function from frontend/src/components/shared/intake/intakeDraftApi.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/intake/intakeDraftApi.ts"
    symbol: "confirmDraft"
    line_start: "109"
    line_end: "129"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.intakedraftapi.confirmdraft` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.intakedraftapi.confirmdraft is the canonical typescript-function named confirmDraft.

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

The symbol is exported across its module boundary as `confirmDraft`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/intakeDraftApi.ts:109-129` — confirmDraft

## Related Knowledge

- `belongs-to` → `project.frontend`
