---
id: "component.backend.backend.src.ai.sections.profile.semantictag"
kind: "typescript-type-alias"
title: "SemanticTag"
status: "observed"
summary: "Exported type-alias from backend/src/ai/sections/profile.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/profile.ts"
    symbol: "SemanticTag"
    line_start: "47"
    line_end: "47"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/profile.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.profile.semantictag` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.profile.semantictag is the canonical typescript-type-alias named SemanticTag.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/sections/validate.ts`

## Invariants

The symbol is exported across its module boundary as `SemanticTag`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/profile.ts:47-47` — SemanticTag

## Related Knowledge

- `belongs-to` → `project.backend`
