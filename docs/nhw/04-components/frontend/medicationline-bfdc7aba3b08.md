---
id: "component.frontend.frontend.src.components.shared.sections.types.medicationline"
kind: "typescript-interface"
title: "MedicationLine"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/sections/types.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "frontend/src/components/shared/sections/types.ts"
    symbol: "MedicationLine"
    line_start: "46"
    line_end: "55"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.types.medicationline` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.types.medicationline is the canonical typescript-interface named MedicationLine.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/sections/ImportSectionsReview.tsx`

## Invariants

The symbol is exported across its module boundary as `MedicationLine`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/types.ts:46-55` — MedicationLine

## Related Knowledge

- `belongs-to` → `project.frontend`
