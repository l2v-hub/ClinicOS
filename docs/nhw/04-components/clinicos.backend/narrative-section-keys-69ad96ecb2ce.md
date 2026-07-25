---
id: "component.backend.backend.src.ai.sections.patient-narrative.narrative-section-keys"
kind: "typescript-constant"
title: "NARRATIVE_SECTION_KEYS"
status: "observed"
summary: "Exported constant from backend/src/ai/sections/patient-narrative.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/sections/patient-narrative.ts"
    symbol: "NARRATIVE_SECTION_KEYS"
    line_start: "12"
    line_end: "23"
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

What does `component.backend.backend.src.ai.sections.patient-narrative.narrative-section-keys` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.patient-narrative.narrative-section-keys is the canonical typescript-constant named NARRATIVE_SECTION_KEYS.

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
- `backend/src/ai/voice/write-services.ts`
- `backend/src/routes/narrative-sections.ts`

## Invariants

The symbol is exported across its module boundary as `NARRATIVE_SECTION_KEYS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/patient-narrative.ts:12-23` — NARRATIVE_SECTION_KEYS

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
