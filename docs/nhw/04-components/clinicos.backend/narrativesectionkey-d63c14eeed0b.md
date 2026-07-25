---
id: "component.backend.backend.src.ai.sections.patient-narrative.narrativesectionkey"
kind: "typescript-type-alias"
title: "NarrativeSectionKey"
status: "observed"
summary: "Exported type-alias from backend/src/ai/sections/patient-narrative.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/sections/patient-narrative.ts"
    symbol: "NarrativeSectionKey"
    line_start: "24"
    line_end: "24"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/patient-narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.patient-narrative.narrativesectionkey` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.patient-narrative.narrativesectionkey is the canonical typescript-type-alias named NarrativeSectionKey.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/voice/write-services.ts`
- `backend/src/routes/narrative-sections.ts`

## Invariants

The symbol is exported across its module boundary as `NarrativeSectionKey`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/patient-narrative.ts:24-24` — NarrativeSectionKey

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
