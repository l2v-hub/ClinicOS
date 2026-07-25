---
id: "component.backend.backend.src.ai.sections.profile.allergystatus"
kind: "typescript-type-alias"
title: "AllergyStatus"
status: "observed"
summary: "Exported type-alias from backend/src/ai/sections/profile.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/profile.ts"
    symbol: "AllergyStatus"
    line_start: "57"
    line_end: "57"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/profile.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.profile.allergystatus` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.profile.allergystatus is the canonical typescript-type-alias named AllergyStatus.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/sections/narrative.ts`
- `backend/src/ai/sections/validate.ts`

## Invariants

The symbol is exported across its module boundary as `AllergyStatus`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/profile.ts:57-57` — AllergyStatus

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
