---
id: "config.discovered.database-url"
kind: "configuration-key"
title: "DATABASE_URL"
status: "observed"
summary: "Configuration key DATABASE_URL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "DATABASE_URL"
    line_start: "1"
    line_end: "1"
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

What does `config.discovered.database-url` represent in ClinicOS?

## Canonical Definition

config.discovered.database-url is the canonical configuration-key named DATABASE_URL.

## Inputs

Environment variable name: `DATABASE_URL`.

## Outputs

Runtime scopes: `["typescript"]`.

## Dependencies

Declared in example configuration: `true`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- typescript

## Invariants

Security classification: sensitive-name; value intentionally excluded.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `backend/.env.example:1-1` — DATABASE_URL

## Related Knowledge

- `belongs-to` → `system.clinicos`
