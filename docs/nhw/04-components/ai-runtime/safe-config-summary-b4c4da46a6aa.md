---
id: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.safe-config-summary'
kind: 'python-function'
title: 'safe_config_summary'
status: 'observed'
summary: 'Public Python function from clinicos-ai-runtime/clinicos_ai/models/env_config.py.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'clinicos-ai-runtime/clinicos_ai/models/env_config.py'
    symbol: 'safe_config_summary'
    line_start: '183'
    line_end: '198'
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
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.safe-config-summary` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.safe-config-summary is the canonical python-function named safe_config_summary.

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

The public symbol name is `safe_config_summary`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/env_config.py:183-198` — safe_config_summary

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
