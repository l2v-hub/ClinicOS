---
id: "component.frontend.frontend.src.components.shared.sections.types.reviewstatus"
kind: "typescript-type-alias"
title: "ReviewStatus"
status: "observed"
summary: "Exported type-alias from frontend/src/components/shared/sections/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/types.ts"
    symbol: "ReviewStatus"
    line_start: "86"
    line_end: "86"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.types.reviewstatus` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.types.reviewstatus is the canonical typescript-type-alias named ReviewStatus.

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

The symbol is exported across its module boundary as `ReviewStatus`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/types.ts:86-86` — ReviewStatus

## Related Knowledge

- `belongs-to` → `project.frontend`
