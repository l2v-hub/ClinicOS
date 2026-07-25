---
id: "component.frontend.frontend.src.lib.allergystatusmodel.allergysummary"
kind: "typescript-interface"
title: "AllergySummary"
status: "observed"
summary: "Exported interface from frontend/src/lib/allergyStatusModel.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/lib/allergyStatusModel.ts"
    symbol: "AllergySummary"
    line_start: "18"
    line_end: "22"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/allergyStatusModel.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.lib.allergystatusmodel.allergysummary` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.allergystatusmodel.allergysummary is the canonical typescript-interface named AllergySummary.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `AllergySummary`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/allergyStatusModel.ts:18-22` — AllergySummary

## Related Knowledge

- `belongs-to` → `project.frontend`
