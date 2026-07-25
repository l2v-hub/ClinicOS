---
id: "component.backend.backend.src.ai.assistant.llm-planner.injectpatientid"
kind: "typescript-function"
title: "injectPatientId"
status: "observed"
summary: "Exported function from backend/src/ai/assistant/llm-planner.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/assistant/llm-planner.ts"
    symbol: "injectPatientId"
    line_start: "57"
    line_end: "63"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/assistant/llm-planner.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.llm-planner.injectpatientid` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.llm-planner.injectpatientid is the canonical typescript-function named injectPatientId.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/llm-planner.test.ts`
- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `injectPatientId`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/llm-planner.ts:57-63` — injectPatientId

## Related Knowledge

- `belongs-to` → `project.backend`
