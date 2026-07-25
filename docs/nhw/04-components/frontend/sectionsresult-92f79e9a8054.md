---
id: "component.frontend.frontend.src.components.shared.sections.types.sectionsresult"
kind: "typescript-interface"
title: "SectionsResult"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/sections/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/types.ts"
    symbol: "SectionsResult"
    line_start: "80"
    line_end: "84"
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

What does `component.frontend.frontend.src.components.shared.sections.types.sectionsresult` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.types.sectionsresult is the canonical typescript-interface named SectionsResult.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/DischargeImportModal.tsx`
- `frontend/src/components/shared/sections/ImportSectionsReview.tsx`
- `frontend/src/components/shared/sections/deriveSections.ts`

## Invariants

The symbol is exported across its module boundary as `SectionsResult`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/types.ts:80-84` — SectionsResult

## Related Knowledge

- `belongs-to` → `project.frontend`
