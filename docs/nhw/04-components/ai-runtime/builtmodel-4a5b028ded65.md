---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.builtmodel"
kind: "python-class"
title: "BuiltModel"
status: "observed"
summary: "Public Python class from clinicos-ai-runtime/clinicos_ai/models/providers/base.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/base.py"
    symbol: "BuiltModel"
    line_start: "25"
    line_end: "29"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/base.py"
    confidence: "observed"
tags:
  - "python"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.builtmodel` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.builtmodel is the canonical python-class named BuiltModel.

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

The public symbol name is `BuiltModel`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/providers/base.py:25-29` — BuiltModel

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
