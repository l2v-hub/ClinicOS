---
id: "config.discovered.ai-runtime-service-token"
kind: "configuration-key"
title: "AI_RUNTIME_SERVICE_TOKEN"
status: "observed"
summary: "Configuration key AI_RUNTIME_SERVICE_TOKEN; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/.env.example"
    symbol: "AI_RUNTIME_SERVICE_TOKEN"
    line_start: "57"
    line_end: "57"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "AI_RUNTIME_SERVICE_TOKEN"
    line_start: "48"
    line_end: "48"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "clinicos-ai-runtime/.env.example,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
tags:
  - "configuration"
  - "python"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `config.discovered.ai-runtime-service-token` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-runtime-service-token is the canonical configuration-key named AI_RUNTIME_SERVICE_TOKEN.

## Inputs

Environment variable name: `AI_RUNTIME_SERVICE_TOKEN`.

## Outputs

Runtime scopes: `["python","typescript"]`.

## Dependencies

Declared in example configuration: `true`.

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

- `clinicos-ai-runtime/.env.example:57-57` — AI_RUNTIME_SERVICE_TOKEN
- `clinicos-ai-runtime/clinicos_ai/api/app.py:48-48` — AI_RUNTIME_SERVICE_TOKEN

## Related Knowledge

- `belongs-to` → `system.clinicos`
