---
id: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-configuration.py.roleconfig'
kind: 'python-class'
title: 'RoleConfig'
status: 'observed'
summary: 'Public Python class from clinicos-ai-runtime/clinicos_ai/models/configuration.py.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'clinicos-ai-runtime/clinicos_ai/models/configuration.py'
    symbol: 'RoleConfig'
    line_start: '27'
    line_end: '33'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.clinicos-ai-runtime'
    evidence: 'clinicos-ai-runtime/clinicos_ai/models/configuration.py'
    confidence: 'observed'
tags:
  - 'python'
  - 'class'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-configuration.py.roleconfig` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-configuration.py.roleconfig is the canonical python-class named RoleConfig.

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

The public symbol name is `RoleConfig`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/configuration.py:27-33` — RoleConfig

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
