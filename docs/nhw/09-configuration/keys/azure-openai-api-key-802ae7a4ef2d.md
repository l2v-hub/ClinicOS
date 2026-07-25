---
id: "config.discovered.azure-openai-api-key"
kind: "configuration-key"
title: "AZURE_OPENAI_API_KEY"
status: "observed"
summary: "Configuration key AZURE_OPENAI_API_KEY; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/azure_docintel.py"
    symbol: "AZURE_OPENAI_API_KEY"
    line_start: "46"
    line_end: "46"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/azure.py"
    symbol: "AZURE_OPENAI_API_KEY"
    line_start: "131"
    line_end: "131"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/azure_docintel.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py"
    confidence: "observed"
tags:
  - "configuration"
  - "python"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `config.discovered.azure-openai-api-key` represent in ClinicOS?

## Canonical Definition

config.discovered.azure-openai-api-key is the canonical configuration-key named AZURE_OPENAI_API_KEY.

## Inputs

Environment variable name: `AZURE_OPENAI_API_KEY`.

## Outputs

Runtime scopes: `["python","typescript"]`.

## Dependencies

Declared in example configuration: `false`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- python
- typescript

## Invariants

Security classification: sensitive-name; value intentionally excluded.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/providers/azure_docintel.py:46-46` — AZURE_OPENAI_API_KEY
- `clinicos-ai-runtime/clinicos_ai/models/providers/azure.py:131-131` — AZURE_OPENAI_API_KEY

## Related Knowledge

- `belongs-to` → `system.clinicos`
