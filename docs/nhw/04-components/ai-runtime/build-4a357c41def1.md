---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-mock.py.build"
kind: "python-function"
title: "build"
status: "observed"
summary: "Public Python function from clinicos-ai-runtime/clinicos_ai/models/providers/mock.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/mock.py"
    symbol: "build"
    line_start: "38"
    line_end: "40"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/mock.py"
    confidence: "observed"
tags:
  - "python"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-mock.py.build` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-mock.py.build is the canonical python-function named build.

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

- `clinicos-ai-runtime/clinicos_ai/models/providers/mock.py:38-40` — build

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
