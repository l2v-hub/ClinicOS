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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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
