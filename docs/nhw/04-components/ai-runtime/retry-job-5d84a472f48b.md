---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.retry-job"
kind: "python-async-function"
title: "retry_job"
status: "observed"
summary: "Public Python async-function from clinicos-ai-runtime/clinicos_ai/api/app.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "retry_job"
    line_start: "198"
    line_end: "207"
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
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.retry-job` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-api-app.py.retry-job is the canonical python-async-function named retry_job.

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

The public symbol name is `retry_job`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/api/app.py:198-207` — retry_job

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
