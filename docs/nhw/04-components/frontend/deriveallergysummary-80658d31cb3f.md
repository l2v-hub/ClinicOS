---
id: "component.frontend.frontend.src.lib.allergystatusmodel.deriveallergysummary"
kind: "typescript-function"
title: "deriveAllergySummary"
status: "observed"
summary: "Exported function from frontend/src/lib/allergyStatusModel.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/lib/allergyStatusModel.ts"
    symbol: "deriveAllergySummary"
    line_start: "24"
    line_end: "47"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/allergyStatusModel.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.lib.allergystatusmodel.deriveallergysummary` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.allergystatusmodel.deriveallergysummary is the canonical typescript-function named deriveAllergySummary.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/lib/__tests__/allergyStatusModel.test.ts`

## Invariants

The symbol is exported across its module boundary as `deriveAllergySummary`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/allergyStatusModel.ts:24-47` — deriveAllergySummary

## Related Knowledge

- `belongs-to` → `project.frontend`
