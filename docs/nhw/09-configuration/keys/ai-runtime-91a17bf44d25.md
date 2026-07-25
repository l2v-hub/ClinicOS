---
id: 'config.discovered.ai-runtime'
kind: 'configuration-key'
title: 'AI_RUNTIME'
status: 'observed'
summary: 'Configuration key AI_RUNTIME; generated knowledge never includes its value.'
bounded_contexts: []
sources:
  - path: 'clinicos-ai-runtime/.env.example'
    symbol: 'AI_RUNTIME'
    line_start: '4'
    line_end: '4'
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
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `config.discovered.ai-runtime` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-runtime is the canonical configuration-key named AI_RUNTIME.

## Inputs

Environment variable name: `AI_RUNTIME`.

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

- `clinicos-ai-runtime/.env.example:4-4` — AI_RUNTIME

## Related Knowledge

- `belongs-to` → `system.clinicos`
