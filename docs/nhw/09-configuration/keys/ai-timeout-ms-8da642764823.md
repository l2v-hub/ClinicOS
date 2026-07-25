---
id: 'config.discovered.ai-timeout-ms'
kind: 'configuration-key'
title: 'AI_TIMEOUT_MS'
status: 'observed'
summary: 'Configuration key AI_TIMEOUT_MS; generated knowledge never includes its value.'
bounded_contexts: []
sources:
  - path: 'backend/.env.example'
    symbol: 'AI_TIMEOUT_MS'
    line_start: '30'
    line_end: '30'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'backend/.env.example'
    confidence: 'observed'
tags:
  - 'configuration'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `config.discovered.ai-timeout-ms` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-timeout-ms is the canonical configuration-key named AI_TIMEOUT_MS.

## Inputs

Environment variable name: `AI_TIMEOUT_MS`.

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

- `backend/.env.example:30-30` — AI_TIMEOUT_MS

## Related Knowledge

- `belongs-to` → `system.clinicos`
