---
id: "component.backend.backend.src.ai.voice.vitals.parsevitalvalue"
kind: "typescript-function"
title: "parseVitalValue"
status: "observed"
summary: "Exported function from backend/src/ai/voice/vitals.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/vitals.ts"
    symbol: "parseVitalValue"
    line_start: "51"
    line_end: "90"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/voice/vitals.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.vitals.parsevitalvalue` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.vitals.parsevitalvalue is the canonical typescript-function named parseVitalValue.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/voice/plan.ts`

## Invariants

The symbol is exported across its module boundary as `parseVitalValue`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/vitals.ts:51-90` — parseVitalValue

## Related Knowledge

- `belongs-to` → `project.backend`
