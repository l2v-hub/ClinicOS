---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.jobresultresponse"
kind: "python-pydantic-model"
title: "JobResultResponse"
status: "observed"
summary: "Public Python pydantic-model from clinicos-ai-runtime/clinicos_ai/domain/contracts.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/domain/contracts.py"
    symbol: "JobResultResponse"
    line_start: "64"
    line_end: "69"
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

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.jobresultresponse` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-domain-contracts.py.jobresultresponse is the canonical python-pydantic-model named JobResultResponse.

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

The public symbol name is `JobResultResponse`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/domain/contracts.py:64-69` — JobResultResponse

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
