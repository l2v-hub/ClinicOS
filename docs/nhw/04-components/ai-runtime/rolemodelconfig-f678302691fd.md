---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.rolemodelconfig"
kind: "python-class"
title: "RoleModelConfig"
status: "observed"
summary: "Public Python class from clinicos-ai-runtime/clinicos_ai/models/env_config.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/env_config.py"
    symbol: "RoleModelConfig"
    line_start: "76"
    line_end: "78"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/env_config.py"
    confidence: "observed"
tags:
  - "python"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.rolemodelconfig` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.rolemodelconfig is the canonical python-class named RoleModelConfig.

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

The public symbol name is `RoleModelConfig`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/env_config.py:76-78` — RoleModelConfig

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
