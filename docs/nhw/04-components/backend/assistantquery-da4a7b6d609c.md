---
id: "component.backend.backend.src.ai.assistant.service.assistantquery"
kind: "typescript-function"
title: "assistantQuery"
status: "observed"
summary: "Exported function from backend/src/ai/assistant/service.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/service.ts"
    symbol: "assistantQuery"
    line_start: "213"
    line_end: "350"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/assistant/service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.service.assistantquery` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.service.assistantquery is the canonical typescript-function named assistantQuery.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/ai-assistant-public.ts`
- `backend/src/routes/internal-ai.ts`

## Invariants

The symbol is exported across its module boundary as `assistantQuery`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/service.ts:213-350` — assistantQuery

## Related Knowledge

- `belongs-to` → `project.backend`
