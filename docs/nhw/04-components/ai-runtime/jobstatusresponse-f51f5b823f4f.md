---
id: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.jobstatusresponse'
kind: 'python-pydantic-model'
title: 'JobStatusResponse'
status: 'observed'
summary: 'Public Python pydantic-model from clinicos-ai-runtime/clinicos_ai/domain/contracts.py.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'clinicos-ai-runtime/clinicos_ai/domain/contracts.py'
    symbol: 'JobStatusResponse'
    line_start: '52'
    line_end: '61'
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

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.jobstatusresponse` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.jobstatusresponse is the canonical python-pydantic-model named JobStatusResponse.

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

The public symbol name is `JobStatusResponse`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/domain/contracts.py:52-61` — JobStatusResponse

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
