---
id: "component.backend.backend.src.ai.assistant.read-tools.read-tools"
kind: "typescript-constant"
title: "READ_TOOLS"
status: "observed"
summary: "Exported constant from backend/src/ai/assistant/read-tools.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/read-tools.ts"
    symbol: "READ_TOOLS"
    line_start: "6"
    line_end: "20"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/assistant/read-tools.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.read-tools.read-tools` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.read-tools.read-tools is the canonical typescript-constant named READ_TOOLS.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/llm-planner.test.ts`

## Invariants

The symbol is exported across its module boundary as `READ_TOOLS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/read-tools.ts:6-20` — READ_TOOLS

## Related Knowledge

- `belongs-to` → `project.backend`
