---
id: "component.backend.backend.src.ai.assistant.service.dispatchquerydata"
kind: "typescript-function"
title: "dispatchQueryData"
status: "observed"
summary: "Exported function from backend/src/ai/assistant/service.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/service.ts"
    symbol: "dispatchQueryData"
    line_start: "420"
    line_end: "435"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/assistant/service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.service.dispatchquerydata` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.service.dispatchquerydata is the canonical typescript-function named dispatchQueryData.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/assistant-query-data.test.ts`

## Invariants

The symbol is exported across its module boundary as `dispatchQueryData`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/service.ts:420-435` — dispatchQueryData

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
