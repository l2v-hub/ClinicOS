---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.assistant-plan"
kind: "python-async-function"
title: "assistant_plan"
status: "observed"
summary: "Public Python async-function from clinicos-ai-runtime/clinicos_ai/api/app.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "assistant_plan"
    line_start: "115"
    line_end: "126"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
tags:
  - "python"
  - "async-function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.assistant-plan` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.assistant-plan is the canonical python-async-function named assistant_plan.

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

The public symbol name is `assistant_plan`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/api/app.py:115-126` — assistant_plan

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
