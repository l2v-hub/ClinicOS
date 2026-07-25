---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-common.py.make-built"
kind: "python-function"
title: "make_built"
status: "observed"
summary: "Public Python function from clinicos-ai-runtime/clinicos_ai/models/providers/_common.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/_common.py"
    symbol: "make_built"
    line_start: "47"
    line_end: "49"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/_common.py"
    confidence: "observed"
tags:
  - "python"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-common.py.make-built` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-common.py.make-built is the canonical python-function named make_built.

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

The public symbol name is `make_built`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/providers/_common.py:47-49` — make_built

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
