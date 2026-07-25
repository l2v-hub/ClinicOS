---
id: "config.discovered.node-env"
kind: "configuration-key"
title: "NODE_ENV"
status: "observed"
summary: "Configuration key NODE_ENV; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "NODE_ENV"
    line_start: "3"
    line_end: "3"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `config.discovered.node-env` represent in ClinicOS?

## Canonical Definition

config.discovered.node-env is the canonical configuration-key named NODE_ENV.

## Inputs

Environment variable name: `NODE_ENV`.

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

- `backend/.env.example:3-3` — NODE_ENV

## Related Knowledge

- `belongs-to` → `system.clinicos`
