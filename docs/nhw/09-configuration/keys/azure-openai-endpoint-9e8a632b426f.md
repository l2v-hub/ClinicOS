---
id: "config.discovered.azure-openai-endpoint"
kind: "configuration-key"
title: "AZURE_OPENAI_ENDPOINT"
status: "observed"
summary: "Configuration key AZURE_OPENAI_ENDPOINT; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/azure_docintel.py"
    symbol: "AZURE_OPENAI_ENDPOINT"
    line_start: "43"
    line_end: "43"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/azure.py"
    symbol: "AZURE_OPENAI_ENDPOINT"
    line_start: "130"
    line_end: "130"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/azure_docintel.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py"
    confidence: "observed"
tags:
  - "configuration"
  - "python"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `config.discovered.azure-openai-endpoint` represent in ClinicOS?

## Canonical Definition

config.discovered.azure-openai-endpoint is the canonical configuration-key named AZURE_OPENAI_ENDPOINT.

## Inputs

Environment variable name: `AZURE_OPENAI_ENDPOINT`.

## Outputs

Runtime scopes: `["python"]`.

## Dependencies

Declared in example configuration: `false`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- python

## Invariants

Security classification: runtime configuration.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/providers/azure_docintel.py:43-43` — AZURE_OPENAI_ENDPOINT
- `clinicos-ai-runtime/clinicos_ai/models/providers/azure.py:130-130` — AZURE_OPENAI_ENDPOINT

## Related Knowledge

- `belongs-to` → `system.clinicos`
