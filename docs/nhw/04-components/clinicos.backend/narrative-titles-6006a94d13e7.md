---
id: "component.backend.backend.src.ai.sections.patient-narrative.narrative-titles"
kind: "typescript-constant"
title: "NARRATIVE_TITLES"
status: "observed"
summary: "Exported constant from backend/src/ai/sections/patient-narrative.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/sections/patient-narrative.ts"
    symbol: "NARRATIVE_TITLES"
    line_start: "26"
    line_end: "37"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/patient-narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.patient-narrative.narrative-titles` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.patient-narrative.narrative-titles is the canonical typescript-constant named NARRATIVE_TITLES.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/patient-narrative.test.ts`

## Invariants

The symbol is exported across its module boundary as `NARRATIVE_TITLES`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/patient-narrative.ts:26-37` — NARRATIVE_TITLES

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
