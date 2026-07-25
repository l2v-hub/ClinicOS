---
id: "component.backend.backend.src.ai.assistant.plan.pickresolvedpatient"
kind: "typescript-function"
title: "pickResolvedPatient"
status: "observed"
summary: "Exported function from backend/src/ai/assistant/plan.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/assistant/plan.ts"
    symbol: "pickResolvedPatient"
    line_start: "300"
    line_end: "306"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/assistant/plan.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.plan.pickresolvedpatient` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.plan.pickresolvedpatient is the canonical typescript-function named pickResolvedPatient.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/assistant-plan.test.ts`
- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `pickResolvedPatient`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/plan.ts:300-306` — pickResolvedPatient

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
