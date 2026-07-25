---
id: "component.backend.backend.src.ai.assistant.read-tools.read-tool-schema"
kind: "typescript-constant"
title: "READ_TOOL_SCHEMA"
status: "observed"
summary: "Exported constant from backend/src/ai/assistant/read-tools.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/read-tools.ts"
    symbol: "READ_TOOL_SCHEMA"
    line_start: "32"
    line_end: "54"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.read-tools.read-tool-schema` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.read-tools.read-tool-schema is the canonical typescript-constant named READ_TOOL_SCHEMA.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/assistant/llm-planner.ts`

## Invariants

The symbol is exported across its module boundary as `READ_TOOL_SCHEMA`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/read-tools.ts:32-54` — READ_TOOL_SCHEMA

## Related Knowledge

- `belongs-to` → `project.backend`
