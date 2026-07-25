---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-profiles.py.capabilities-for"
kind: "python-function"
title: "capabilities_for"
status: "observed"
summary: "Public Python function from clinicos-ai-runtime/clinicos_ai/models/profiles.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/profiles.py"
    symbol: "capabilities_for"
    line_start: "13"
    line_end: "57"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/profiles.py"
    confidence: "observed"
tags:
  - "python"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-profiles.py.capabilities-for` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-profiles.py.capabilities-for is the canonical python-function named capabilities_for.

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

The public symbol name is `capabilities_for`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/profiles.py:13-57` — capabilities_for

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
