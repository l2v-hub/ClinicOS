---
id: "component.frontend.frontend.src.components.shared.intake.stepingresso.ingressodata"
kind: "typescript-interface"
title: "IngressoData"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/intake/StepIngresso.tsx."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/intake/StepIngresso.tsx"
    symbol: "IngressoData"
    line_start: "15"
    line_end: "24"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/intake/StepIngresso.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.stepingresso.ingressodata` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.stepingresso.ingressodata is the canonical typescript-interface named IngressoData.

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

The symbol is exported across its module boundary as `IngressoData`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/StepIngresso.tsx:15-24` — IngressoData

## Related Knowledge

- `belongs-to` → `project.frontend`
