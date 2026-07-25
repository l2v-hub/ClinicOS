---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.modelrunner"
kind: "python-provider"
title: "ModelRunner"
status: "observed"
summary: "Public Python provider from clinicos-ai-runtime/clinicos_ai/models/providers/base.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/base.py"
    symbol: "ModelRunner"
    line_start: "19"
    line_end: "21"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/base.py"
    confidence: "observed"
tags:
  - "python"
  - "provider"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.modelrunner` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.modelrunner is the canonical python-provider named ModelRunner.

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

The public symbol name is `ModelRunner`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/providers/base.py:19-21` — ModelRunner

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
