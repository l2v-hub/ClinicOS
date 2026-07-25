---
id: "config.discovered.ai-ocr-provider"
kind: "configuration-key"
title: "AI_OCR_PROVIDER"
status: "observed"
summary: "Configuration key AI_OCR_PROVIDER; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/.env.example"
    symbol: "AI_OCR_PROVIDER"
    line_start: "25"
    line_end: "25"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "clinicos-ai-runtime/.env.example"
    confidence: "observed"
tags:
  - "configuration"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `config.discovered.ai-ocr-provider` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-ocr-provider is the canonical configuration-key named AI_OCR_PROVIDER.

## Inputs

Environment variable name: `AI_OCR_PROVIDER`.

## Outputs

Runtime scopes: None observed.

## Dependencies

Declared in example configuration: `true`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

None observed

## Invariants

Security classification: runtime configuration.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `clinicos-ai-runtime/.env.example:25-25` — AI_OCR_PROVIDER

## Related Knowledge

- `belongs-to` → `system.clinicos`
