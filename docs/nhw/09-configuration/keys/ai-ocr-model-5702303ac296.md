---
id: 'config.discovered.ai-ocr-model'
kind: 'configuration-key'
title: 'AI_OCR_MODEL'
status: 'observed'
summary: 'Configuration key AI_OCR_MODEL; generated knowledge never includes its value.'
bounded_contexts: []
sources:
  - path: 'clinicos-ai-runtime/.env.example'
    symbol: 'AI_OCR_MODEL'
    line_start: '26'
    line_end: '26'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'clinicos-ai-runtime/.env.example'
    confidence: 'observed'
tags:
  - 'configuration'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `config.discovered.ai-ocr-model` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-ocr-model is the canonical configuration-key named AI_OCR_MODEL.

## Inputs

Environment variable name: `AI_OCR_MODEL`.

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

- `clinicos-ai-runtime/.env.example:26-26` — AI_OCR_MODEL

## Related Knowledge

- `belongs-to` → `system.clinicos`
