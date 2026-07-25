---
id: "config.discovered.ai-provider"
kind: "configuration-key"
title: "AI_PROVIDER"
status: "observed"
summary: "Configuration key AI_PROVIDER; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_PROVIDER"
    line_start: "20"
    line_end: "20"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/.env.example"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `config.discovered.ai-provider` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-provider is the canonical configuration-key named AI_PROVIDER.

## Inputs

Environment variable name: `AI_PROVIDER`.

## Outputs

Runtime scopes: `["typescript"]`.

## Dependencies

Declared in example configuration: `true`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- typescript

## Invariants

Security classification: runtime configuration.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `backend/.env.example:20-20` — AI_PROVIDER

## Related Knowledge

- `belongs-to` → `system.clinicos`
