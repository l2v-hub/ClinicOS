---
id: "component.backend.backend.src.ai.voice.preview.buildpreview"
kind: "typescript-function"
title: "buildPreview"
status: "observed"
summary: "Exported function from backend/src/ai/voice/preview.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/preview.ts"
    symbol: "buildPreview"
    line_start: "21"
    line_end: "81"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/preview.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.preview.buildpreview` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.preview.buildpreview is the canonical typescript-function named buildPreview.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/voice.test.ts`
- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `buildPreview`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/preview.ts:21-81` — buildPreview

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
