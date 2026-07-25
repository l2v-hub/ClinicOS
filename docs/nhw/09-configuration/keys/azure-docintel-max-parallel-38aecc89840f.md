---
id: "config.discovered.azure-docintel-max-parallel"
kind: "configuration-key"
title: "AZURE_DOCINTEL_MAX_PARALLEL"
status: "observed"
summary: "Configuration key AZURE_DOCINTEL_MAX_PARALLEL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/azure_docintel.py"
    symbol: "AZURE_DOCINTEL_MAX_PARALLEL"
    line_start: "38"
    line_end: "38"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/azure_docintel.py"
    confidence: "observed"
tags:
  - "configuration"
  - "python"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `config.discovered.azure-docintel-max-parallel` represent in ClinicOS?

## Canonical Definition

config.discovered.azure-docintel-max-parallel is the canonical configuration-key named AZURE_DOCINTEL_MAX_PARALLEL.

## Inputs

Environment variable name: `AZURE_DOCINTEL_MAX_PARALLEL`.

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

- `clinicos-ai-runtime/clinicos_ai/models/providers/azure_docintel.py:38-38` — AZURE_DOCINTEL_MAX_PARALLEL

## Related Knowledge

- `belongs-to` → `system.clinicos`
