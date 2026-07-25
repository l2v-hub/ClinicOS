---
id: "component.backend.backend.src.ai.sections.narrative.buildnarrativedraft"
kind: "typescript-function"
title: "buildNarrativeDraft"
status: "observed"
summary: "Exported function from backend/src/ai/sections/narrative.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/sections/narrative.ts"
    symbol: "buildNarrativeDraft"
    line_start: "139"
    line_end: "210"
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

What does `component.backend.backend.src.ai.sections.narrative.buildnarrativedraft` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.narrative.buildnarrativedraft is the canonical typescript-function named buildNarrativeDraft.

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
- `backend/src/ai/__tests__/patient-narrative.test.ts`

## Invariants

The symbol is exported across its module boundary as `buildNarrativeDraft`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/narrative.ts:139-210` — buildNarrativeDraft

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
