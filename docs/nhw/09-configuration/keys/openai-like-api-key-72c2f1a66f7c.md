---
id: "config.discovered.openai-like-api-key"
kind: "configuration-key"
title: "OPENAI_LIKE_API_KEY"
status: "observed"
summary: "Configuration key OPENAI_LIKE_API_KEY; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/openai_like.py"
    symbol: "OPENAI_LIKE_API_KEY"
    line_start: "23"
    line_end: "23"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/openai_like.py"
    confidence: "observed"
tags:
  - "configuration"
  - "python"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `config.discovered.openai-like-api-key` represent in ClinicOS?

## Canonical Definition

config.discovered.openai-like-api-key is the canonical configuration-key named OPENAI_LIKE_API_KEY.

## Inputs

Environment variable name: `OPENAI_LIKE_API_KEY`.

## Outputs

Runtime scopes: `["python"]`.

## Dependencies

Declared in example configuration: `false`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- python

## Invariants

Security classification: sensitive-name; value intentionally excluded.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/providers/openai_like.py:23-23` — OPENAI_LIKE_API_KEY

## Related Knowledge

- `belongs-to` → `system.clinicos`
