---
id: 'component.backend.backend.src.ai.assistant.config.assistantllmconfig'
kind: 'typescript-interface'
title: 'AssistantLlmConfig'
status: 'observed'
summary: 'Exported interface from backend/src/ai/assistant/config.ts.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'backend/src/ai/assistant/config.ts'
    symbol: 'AssistantLlmConfig'
    line_start: '4'
    line_end: '12'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/assistant/config.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.config.assistantllmconfig` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.config.assistantllmconfig is the canonical typescript-interface named AssistantLlmConfig.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/assistant/runtime-client.ts`

## Invariants

The symbol is exported across its module boundary as `AssistantLlmConfig`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/config.ts:4-12` — AssistantLlmConfig

## Related Knowledge

- `belongs-to` → `project.backend`
