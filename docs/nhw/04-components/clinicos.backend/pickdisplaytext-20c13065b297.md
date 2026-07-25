---
id: "component.backend.backend.src.ai.sections.patient-narrative.pickdisplaytext"
kind: "typescript-function"
title: "pickDisplayText"
status: "observed"
summary: "Exported function from backend/src/ai/sections/patient-narrative.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/sections/patient-narrative.ts"
    symbol: "pickDisplayText"
    line_start: "103"
    line_end: "105"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/patient-narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.patient-narrative.pickdisplaytext` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.patient-narrative.pickdisplaytext is the canonical typescript-function named pickDisplayText.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/patient-narrative.test.ts`
- `backend/src/ai/voice/write-services.ts`

## Invariants

The symbol is exported across its module boundary as `pickDisplayText`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/patient-narrative.ts:103-105` — pickDisplayText

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
