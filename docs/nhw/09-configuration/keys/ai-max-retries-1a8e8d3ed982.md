---
id: 'config.discovered.ai-max-retries'
kind: 'configuration-key'
title: 'AI_MAX_RETRIES'
status: 'observed'
summary: 'Configuration key AI_MAX_RETRIES; generated knowledge never includes its value.'
bounded_contexts: []
sources:
  - path: 'backend/.env.example'
    symbol: 'AI_MAX_RETRIES'
    line_start: '31'
    line_end: '31'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/.env.example'
    symbol: 'AI_MAX_RETRIES'
    line_start: '44'
    line_end: '44'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'backend/.env.example,clinicos-ai-runtime/.env.example'
    confidence: 'observed'
tags:
  - 'configuration'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `config.discovered.ai-max-retries` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-max-retries is the canonical configuration-key named AI_MAX_RETRIES.

## Inputs

Environment variable name: `AI_MAX_RETRIES`.

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

- `backend/.env.example:31-31` — AI_MAX_RETRIES
- `clinicos-ai-runtime/.env.example:44-44` — AI_MAX_RETRIES

## Related Knowledge

- `belongs-to` → `system.clinicos`
