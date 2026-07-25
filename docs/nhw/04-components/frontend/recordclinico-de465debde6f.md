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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
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
