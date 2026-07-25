---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.llm-health-summary"
kind: "python-function"
title: "llm_health_summary"
status: "observed"
summary: "Public Python function from clinicos-ai-runtime/clinicos_ai/models/env_config.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/env_config.py"
    symbol: "llm_health_summary"
    line_start: "231"
    line_end: "267"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.llm-health-summary` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.llm-health-summary is the canonical python-function named llm_health_summary.

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

The public symbol name is `llm_health_summary`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/env_config.py:231-267` — llm_health_summary

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
