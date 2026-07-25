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
    target: "project.backend"
    evidence: "backend/src/ai/sections/validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
