---
id: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.assistantcomposeresponse'
kind: 'python-pydantic-model'
title: 'AssistantComposeResponse'
status: 'observed'
summary: 'Public Python pydantic-model from clinicos-ai-runtime/clinicos_ai/domain/contracts.py.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'clinicos-ai-runtime/clinicos_ai/domain/contracts.py'
    symbol: 'AssistantComposeResponse'
    line_start: '102'
    line_end: '105'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.clinicos-ai-runtime'
    evidence: 'clinicos-ai-runtime/clinicos_ai/domain/contracts.py'
    confidence: 'observed'
tags:
  - 'python'
  - 'pydantic-model'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.assistantcomposeresponse` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.assistantcomposeresponse is the canonical python-pydantic-model named AssistantComposeResponse.

## Inputs

Defined by the Python signature at the cited source span.

## Outputs

Defined by return annotations and implementation.

## Dependencies

Owning project: `project.clinicos-ai-runtime`.

## Side Effects

None observed

## Consumers

Import consumers are resolved through the source graph.

## Invariants

The public symbol name is `AssistantComposeResponse`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/domain/contracts.py:102-105` — AssistantComposeResponse

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
