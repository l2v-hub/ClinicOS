---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-assistant.py.run-assistant-compose"
kind: "python-async-function"
title: "run_assistant_compose"
status: "observed"
summary: "Public Python async-function from clinicos-ai-runtime/clinicos_ai/agents/assistant.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/agents/assistant.py"
    symbol: "run_assistant_compose"
    line_start: "171"
    line_end: "184"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/agents/assistant.py"
    confidence: "observed"
tags:
  - "python"
  - "async-function"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-assistant.py.run-assistant-compose` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-assistant.py.run-assistant-compose is the canonical python-async-function named run_assistant_compose.

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

The public symbol name is `run_assistant_compose`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/agents/assistant.py:171-184` — run_assistant_compose

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
