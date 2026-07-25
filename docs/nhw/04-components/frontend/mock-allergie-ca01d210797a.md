---
id: "component.frontend.frontend.src.mockdata.mock-allergie"
kind: "typescript-constant"
title: "MOCK_ALLERGIE"
status: "observed"
summary: "Exported constant from frontend/src/mockData.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "MOCK_ALLERGIE"
    line_start: "809"
    line_end: "823"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/mockData.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.mockdata.mock-allergie` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.mock-allergie is the canonical typescript-constant named MOCK_ALLERGIE.

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

The symbol is exported across its module boundary as `MOCK_ALLERGIE`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:809-823` — MOCK_ALLERGIE

## Related Knowledge

- `belongs-to` → `project.frontend`
