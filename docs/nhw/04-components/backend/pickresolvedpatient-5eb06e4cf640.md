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
    target: "project.backend"
    evidence: "backend/src/ai/assistant/plan.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
