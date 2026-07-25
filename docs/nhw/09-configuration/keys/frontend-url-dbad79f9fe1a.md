---
id: "config.discovered.frontend-url"
kind: "configuration-key"
title: "FRONTEND_URL"
status: "observed"
summary: "Configuration key FRONTEND_URL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "FRONTEND_URL"
    line_start: "9"
    line_end: "9"
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

What does `config.discovered.frontend-url` represent in ClinicOS?

## Canonical Definition

config.discovered.frontend-url is the canonical configuration-key named FRONTEND_URL.

## Inputs

Environment variable name: `FRONTEND_URL`.

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

- `backend/.env.example:9-9` — FRONTEND_URL

## Related Knowledge

- `belongs-to` → `system.clinicos`
