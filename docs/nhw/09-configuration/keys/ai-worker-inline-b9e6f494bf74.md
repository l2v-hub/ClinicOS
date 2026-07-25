---
id: "config.discovered.ai-worker-inline"
kind: "configuration-key"
title: "AI_WORKER_INLINE"
status: "observed"
summary: "Configuration key AI_WORKER_INLINE; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_WORKER_INLINE"
    line_start: "51"
    line_end: "51"
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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `config.discovered.ai-worker-inline` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-worker-inline is the canonical configuration-key named AI_WORKER_INLINE.

## Inputs

Environment variable name: `AI_WORKER_INLINE`.

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

- `backend/.env.example:51-51` — AI_WORKER_INLINE

## Related Knowledge

- `belongs-to` → `system.clinicos`
