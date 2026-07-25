---
id: "component.backend.backend.src.ai.assistant.runtime-client.callcomposeruntime"
kind: "typescript-function"
title: "callComposeRuntime"
status: "observed"
summary: "Exported function from backend/src/ai/assistant/runtime-client.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/runtime-client.ts"
    symbol: "callComposeRuntime"
    line_start: "30"
    line_end: "45"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/assistant/runtime-client.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.runtime-client.callcomposeruntime` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.runtime-client.callcomposeruntime is the canonical typescript-function named callComposeRuntime.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `callComposeRuntime`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/runtime-client.ts:30-45` — callComposeRuntime

## Related Knowledge

- `belongs-to` → `project.backend`
