---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-errors.py.providerunavailableerror"
kind: "python-provider"
title: "ProviderUnavailableError"
status: "observed"
summary: "Public Python provider from clinicos-ai-runtime/clinicos_ai/models/errors.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/errors.py"
    symbol: "ProviderUnavailableError"
    line_start: "45"
    line_end: "47"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/errors.py"
    confidence: "observed"
tags:
  - "python"
  - "provider"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-errors.py.providerunavailableerror` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-errors.py.providerunavailableerror is the canonical python-provider named ProviderUnavailableError.

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

The public symbol name is `ProviderUnavailableError`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/errors.py:45-47` — ProviderUnavailableError

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
