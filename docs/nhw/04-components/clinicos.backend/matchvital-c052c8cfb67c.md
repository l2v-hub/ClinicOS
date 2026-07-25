---
id: "component.backend.backend.src.ai.voice.vitals.matchvital"
kind: "typescript-function"
title: "matchVital"
status: "observed"
summary: "Exported function from backend/src/ai/voice/vitals.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/vitals.ts"
    symbol: "matchVital"
    line_start: "38"
    line_end: "42"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/vitals.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.vitals.matchvital` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.vitals.matchvital is the canonical typescript-function named matchVital.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/voice/plan.ts`

## Invariants

The symbol is exported across its module boundary as `matchVital`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/vitals.ts:38-42` — matchVital

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
