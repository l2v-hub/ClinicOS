---
id: "component.backend.backend.src.ai.voice.preview.previewcontext"
kind: "typescript-interface"
title: "PreviewContext"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/preview.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/preview.ts"
    symbol: "PreviewContext"
    line_start: "15"
    line_end: "19"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/preview.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.preview.previewcontext` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.preview.previewcontext is the canonical typescript-interface named PreviewContext.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `PreviewContext`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/preview.ts:15-19` — PreviewContext

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
