---
id: "component.backend.backend.src.ai.sections.validate.annotation"
kind: "typescript-interface"
title: "Annotation"
status: "observed"
summary: "Exported interface from backend/src/ai/sections/validate.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/ai/sections/validate.ts"
    symbol: "Annotation"
    line_start: "43"
    line_end: "48"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.validate.annotation` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.validate.annotation is the canonical typescript-interface named Annotation.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/narrative.test.ts`
- `backend/src/ai/sections/narrative.ts`

## Invariants

The symbol is exported across its module boundary as `Annotation`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/validate.ts:43-48` — Annotation

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
