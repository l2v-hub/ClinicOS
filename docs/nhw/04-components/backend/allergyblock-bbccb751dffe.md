---
id: "component.backend.backend.src.ai.sections.validate.allergyblock"
kind: "typescript-interface"
title: "AllergyBlock"
status: "observed"
summary: "Exported interface from backend/src/ai/sections/validate.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/validate.ts"
    symbol: "AllergyBlock"
    line_start: "71"
    line_end: "77"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.validate.allergyblock` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.validate.allergyblock is the canonical typescript-interface named AllergyBlock.

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

The symbol is exported across its module boundary as `AllergyBlock`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/validate.ts:71-77` — AllergyBlock

## Related Knowledge

- `belongs-to` → `project.backend`
