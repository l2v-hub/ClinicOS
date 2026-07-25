---
id: "component.frontend.frontend.src.components.shared.sections.dateprefix.withdateprefixes"
kind: "typescript-function"
title: "withDatePrefixes"
status: "observed"
summary: "Exported function from frontend/src/components/shared/sections/datePrefix.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/datePrefix.ts"
    symbol: "withDatePrefixes"
    line_start: "48"
    line_end: "57"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/datePrefix.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.dateprefix.withdateprefixes` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.dateprefix.withdateprefixes is the canonical typescript-function named withDatePrefixes.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/scripts/req038-evidence.mts`
- `frontend/src/components/shared/sections/SemanticTaggedText.tsx`
- `frontend/src/components/shared/sections/__tests__/datePrefix.test.ts`

## Invariants

The symbol is exported across its module boundary as `withDatePrefixes`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/datePrefix.ts:48-57` — withDatePrefixes

## Related Knowledge

- `belongs-to` → `project.frontend`
