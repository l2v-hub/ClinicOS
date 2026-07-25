---
id: "component.backend.backend.src.ai.assistant.read-tools.isreadtool"
kind: "typescript-function"
title: "isReadTool"
status: "observed"
summary: "Exported function from backend/src/ai/assistant/read-tools.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/read-tools.ts"
    symbol: "isReadTool"
    line_start: "27"
    line_end: "29"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/assistant/read-tools.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.read-tools.isreadtool` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.read-tools.isreadtool is the canonical typescript-function named isReadTool.

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
- `backend/src/ai/assistant/llm-planner.ts`

## Invariants

The symbol is exported across its module boundary as `isReadTool`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/read-tools.ts:27-29` — isReadTool

## Related Knowledge

- `belongs-to` → `project.backend`
