---
id: "component.backend.backend.src.ai.voice.vitals.vitalspec"
kind: "typescript-interface"
title: "VitalSpec"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/vitals.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/vitals.ts"
    symbol: "VitalSpec"
    line_start: "5"
    line_end: "12"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/vitals.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.vitals.vitalspec` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.vitals.vitalspec is the canonical typescript-interface named VitalSpec.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `VitalSpec`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/vitals.ts:5-12` — VitalSpec

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
