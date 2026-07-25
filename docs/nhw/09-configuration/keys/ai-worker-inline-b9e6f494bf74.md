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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
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
