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
    target: "project.backend"
    evidence: "backend/src/ai/voice/preview.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
