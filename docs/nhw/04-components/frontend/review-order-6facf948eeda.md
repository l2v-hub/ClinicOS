---
id: "component.frontend.frontend.src.components.shared.sections.sectionmapping.review-order"
kind: "typescript-constant"
title: "REVIEW_ORDER"
status: "observed"
summary: "Exported constant from frontend/src/components/shared/sections/sectionMapping.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/sectionMapping.ts"
    symbol: "REVIEW_ORDER"
    line_start: "34"
    line_end: "47"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/sectionMapping.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.sectionmapping.review-order` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.sectionmapping.review-order is the canonical typescript-constant named REVIEW_ORDER.

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

The symbol is exported across its module boundary as `REVIEW_ORDER`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/sectionMapping.ts:34-47` — REVIEW_ORDER

## Related Knowledge

- `belongs-to` → `project.frontend`
