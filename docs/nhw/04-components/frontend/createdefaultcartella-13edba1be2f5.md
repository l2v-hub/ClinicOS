---
id: "component.frontend.frontend.src.mockdata.createdefaultcartella"
kind: "typescript-function"
title: "createDefaultCartella"
status: "observed"
summary: "Exported function from frontend/src/mockData.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "createDefaultCartella"
    line_start: "27"
    line_end: "80"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/mockData.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.mockdata.createdefaultcartella` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.createdefaultcartella is the canonical typescript-function named createDefaultCartella.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`

## Invariants

The symbol is exported across its module boundary as `createDefaultCartella`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:27-80` — createDefaultCartella

## Related Knowledge

- `belongs-to` → `project.frontend`
