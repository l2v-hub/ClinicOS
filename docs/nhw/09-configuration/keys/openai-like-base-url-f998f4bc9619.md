---
id: "config.discovered.openai-like-base-url"
kind: "configuration-key"
title: "OPENAI_LIKE_BASE_URL"
status: "observed"
summary: "Configuration key OPENAI_LIKE_BASE_URL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/openai_like.py"
    symbol: "OPENAI_LIKE_BASE_URL"
    line_start: "12"
    line_end: "12"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `config.discovered.openai-like-base-url` represent in ClinicOS?

## Canonical Definition

config.discovered.openai-like-base-url is the canonical configuration-key named OPENAI_LIKE_BASE_URL.

## Inputs

Environment variable name: `OPENAI_LIKE_BASE_URL`.

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

- `clinicos-ai-runtime/clinicos_ai/models/providers/openai_like.py:12-12` — OPENAI_LIKE_BASE_URL

## Related Knowledge

- `belongs-to` → `system.clinicos`
