---
id: "component.backend.backend.src.ai.sections.narrative.validatenarrativedraft"
kind: "typescript-function"
title: "validateNarrativeDraft"
status: "observed"
summary: "Exported function from backend/src/ai/sections/narrative.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/sections/narrative.ts"
    symbol: "validateNarrativeDraft"
    line_start: "260"
    line_end: "275"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.narrative.validatenarrativedraft` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.narrative.validatenarrativedraft is the canonical typescript-function named validateNarrativeDraft.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/narrative.test.ts`

## Invariants

The symbol is exported across its module boundary as `validateNarrativeDraft`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/narrative.ts:260-275` — validateNarrativeDraft

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
