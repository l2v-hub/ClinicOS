---
id: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-openai.py.build'
kind: 'python-function'
title: 'build'
status: 'observed'
summary: 'Public Python function from clinicos-ai-runtime/clinicos_ai/models/providers/openai.py.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'clinicos-ai-runtime/clinicos_ai/models/providers/openai.py'
    symbol: 'build'
    line_start: '9'
    line_end: '17'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.clinicos-ai-runtime'
    evidence: 'clinicos-ai-runtime/clinicos_ai/models/providers/openai.py'
    confidence: 'observed'
tags:
  - 'python'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-openai.py.build` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-openai.py.build is the canonical python-function named build.

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

The public symbol name is `build`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/providers/openai.py:9-17` — build

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
