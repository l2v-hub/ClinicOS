---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-factory.py.modelfactory"
kind: "python-class"
title: "ModelFactory"
status: "observed"
summary: "Public Python class from clinicos-ai-runtime/clinicos_ai/models/factory.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/factory.py"
    symbol: "ModelFactory"
    line_start: "32"
    line_end: "51"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/factory.py"
    confidence: "observed"
tags:
  - "python"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-factory.py.modelfactory` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-factory.py.modelfactory is the canonical python-class named ModelFactory.

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

The public symbol name is `ModelFactory`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/factory.py:32-51` — ModelFactory

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
