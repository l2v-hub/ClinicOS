---
id: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.resolve-repair'
kind: 'python-function'
title: 'resolve_repair'
status: 'observed'
summary: 'Public Python function from clinicos-ai-runtime/clinicos_ai/models/env_config.py.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'clinicos-ai-runtime/clinicos_ai/models/env_config.py'
    symbol: 'resolve_repair'
    line_start: '159'
    line_end: '176'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.clinicos-ai-runtime'
    evidence: 'clinicos-ai-runtime/clinicos_ai/models/env_config.py'
    confidence: 'observed'
tags:
  - 'python'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.resolve-repair` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.resolve-repair is the canonical python-function named resolve_repair.

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

The public symbol name is `resolve_repair`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/env_config.py:159-176` — resolve_repair

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
