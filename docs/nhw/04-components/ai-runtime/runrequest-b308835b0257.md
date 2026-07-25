---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.runrequest"
kind: "python-pydantic-model"
title: "RunRequest"
status: "observed"
summary: "Public Python pydantic-model from clinicos-ai-runtime/clinicos_ai/domain/contracts.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/domain/contracts.py"
    symbol: "RunRequest"
    line_start: "41"
    line_end: "43"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/domain/contracts.py"
    confidence: "observed"
tags:
  - "python"
  - "pydantic-model"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.runrequest` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.runrequest is the canonical python-pydantic-model named RunRequest.

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

The public symbol name is `RunRequest`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/domain/contracts.py:41-43` — RunRequest

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
