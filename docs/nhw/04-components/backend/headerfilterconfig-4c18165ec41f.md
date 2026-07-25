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
    target: "project.backend"
    evidence: "backend/src/ai/sections/header-filter.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
