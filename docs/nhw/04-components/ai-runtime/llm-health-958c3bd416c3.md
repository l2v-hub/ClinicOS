---
id: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.llm-health'
kind: 'python-function'
title: 'llm_health'
status: 'observed'
summary: 'Public Python function from clinicos-ai-runtime/clinicos_ai/api/app.py.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'clinicos-ai-runtime/clinicos_ai/api/app.py'
    symbol: 'llm_health'
    line_start: '108'
    line_end: '109'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.clinicos-ai-runtime'
    evidence: 'clinicos-ai-runtime/clinicos_ai/api/app.py'
    confidence: 'observed'
tags:
  - 'python'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.llm-health` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.llm-health is the canonical python-function named llm_health.

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

The public symbol name is `llm_health`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/api/app.py:108-109` — llm_health

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
