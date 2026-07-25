---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-assistant.py.parse-plan-json"
kind: "python-function"
title: "parse_plan_json"
status: "observed"
summary: "Public Python function from clinicos-ai-runtime/clinicos_ai/agents/assistant.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/agents/assistant.py"
    symbol: "parse_plan_json"
    line_start: "122"
    line_end: "139"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/agents/assistant.py"
    confidence: "observed"
tags:
  - "python"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-assistant.py.parse-plan-json` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-assistant.py.parse-plan-json is the canonical python-function named parse_plan_json.

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

The public symbol name is `parse_plan_json`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/agents/assistant.py:122-139` — parse_plan_json

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
