---
id: "component.backend.backend.src.ai.sections.header-filter.headerfilterconfig"
kind: "typescript-interface"
title: "HeaderFilterConfig"
status: "observed"
summary: "Exported interface from backend/src/ai/sections/header-filter.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/header-filter.ts"
    symbol: "HeaderFilterConfig"
    line_start: "41"
    line_end: "48"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/header-filter.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.header-filter.headerfilterconfig` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.header-filter.headerfilterconfig is the canonical typescript-interface named HeaderFilterConfig.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `HeaderFilterConfig`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/header-filter.ts:41-48` — HeaderFilterConfig

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
