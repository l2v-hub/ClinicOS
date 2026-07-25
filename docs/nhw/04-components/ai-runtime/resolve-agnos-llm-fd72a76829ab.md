---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.resolve-agnos-llm"
kind: "python-function"
title: "resolve_agnos_llm"
status: "observed"
summary: "Public Python function from clinicos-ai-runtime/clinicos_ai/models/env_config.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/env_config.py"
    symbol: "resolve_agnos_llm"
    line_start: "83"
    line_end: "128"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/env_config.py"
    confidence: "observed"
tags:
  - "python"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.resolve-agnos-llm` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.resolve-agnos-llm is the canonical python-function named resolve_agnos_llm.

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

The public symbol name is `resolve_agnos_llm`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/env_config.py:83-128` — resolve_agnos_llm

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
