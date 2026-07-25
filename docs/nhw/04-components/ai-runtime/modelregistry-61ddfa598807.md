---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-registry.py.modelregistry"
kind: "python-class"
title: "ModelRegistry"
status: "observed"
summary: "Public Python class from clinicos-ai-runtime/clinicos_ai/models/registry.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/registry.py"
    symbol: "ModelRegistry"
    line_start: "31"
    line_end: "109"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/registry.py"
    confidence: "observed"
tags:
  - "python"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-registry.py.modelregistry` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-registry.py.modelregistry is the canonical python-class named ModelRegistry.

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

The public symbol name is `ModelRegistry`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/registry.py:31-109` — ModelRegistry

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
