---
id: "component.backend.backend.src.ai.voice.types.actionpreview"
kind: "typescript-interface"
title: "ActionPreview"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/types.ts"
    symbol: "ActionPreview"
    line_start: "59"
    line_end: "72"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/voice/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.types.actionpreview` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.types.actionpreview is the canonical typescript-interface named ActionPreview.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/appointments.ts`
- `backend/src/ai/actions/consegne.ts`
- `backend/src/ai/actions/orchestrate.ts`
- `backend/src/ai/voice/preview.ts`

## Invariants

The symbol is exported across its module boundary as `ActionPreview`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/types.ts:59-72` — ActionPreview

## Related Knowledge

- `belongs-to` → `project.backend`
