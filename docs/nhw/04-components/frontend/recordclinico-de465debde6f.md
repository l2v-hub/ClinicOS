---
id: "component.frontend.frontend.src.types.recordclinico"
kind: "typescript-interface"
title: "RecordClinico"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "RecordClinico"
    line_start: "274"
    line_end: "280"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.types.recordclinico` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.recordclinico is the canonical typescript-interface named RecordClinico.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `RecordClinico`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:274-280` — RecordClinico

## Related Knowledge

- `belongs-to` → `project.frontend`
