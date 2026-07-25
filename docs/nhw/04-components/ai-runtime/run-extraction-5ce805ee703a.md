---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-extraction.py.run-extraction"
kind: "python-async-function"
title: "run_extraction"
status: "observed"
summary: "Public Python async-function from clinicos-ai-runtime/clinicos_ai/agents/extraction.py."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/agents/extraction.py"
    symbol: "run_extraction"
    line_start: "31"
    line_end: "65"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/agents/extraction.py"
    confidence: "observed"
tags:
  - "python"
  - "async-function"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-extraction.py.run-extraction` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-extraction.py.run-extraction is the canonical python-async-function named run_extraction.

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

The public symbol name is `run_extraction`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/agents/extraction.py:31-65` — run_extraction

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
