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
    line_start: "33"
    line_end: "52"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
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

- `clinicos-ai-runtime/clinicos_ai/models/factory.py:33-52` — ModelFactory

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
