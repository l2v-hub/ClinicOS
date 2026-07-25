---
id: "config.discovered.mistral-ocr-url"
kind: "configuration-key"
title: "MISTRAL_OCR_URL"
status: "observed"
summary: "Configuration key MISTRAL_OCR_URL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py"
    symbol: "MISTRAL_OCR_URL"
    line_start: "68"
    line_end: "68"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py"
    confidence: "observed"
tags:
  - "configuration"
  - "python"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `config.discovered.mistral-ocr-url` represent in ClinicOS?

## Canonical Definition

config.discovered.mistral-ocr-url is the canonical configuration-key named MISTRAL_OCR_URL.

## Inputs

Environment variable name: `MISTRAL_OCR_URL`.

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

- `clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py:68-68` — MISTRAL_OCR_URL

## Related Knowledge

- `belongs-to` → `system.clinicos`
