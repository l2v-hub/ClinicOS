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
    target: "project.backend"
    evidence: "backend/src/ai/sections/patient-narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
