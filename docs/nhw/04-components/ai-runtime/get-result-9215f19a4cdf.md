---
id: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.get-result'
kind: 'python-function'
title: 'get_result'
status: 'observed'
summary: 'Public Python function from clinicos-ai-runtime/clinicos_ai/api/app.py.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'clinicos-ai-runtime/clinicos_ai/api/app.py'
    symbol: 'get_result'
    line_start: '188'
    line_end: '194'
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
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.get-result` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.get-result is the canonical python-function named get_result.

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

The public symbol name is `get_result`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/api/app.py:188-194` — get_result

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
