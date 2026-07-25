---
id: "config.discovered.vite-api-url"
kind: "configuration-key"
title: "VITE_API_URL"
status: "observed"
summary: "Configuration key VITE_API_URL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "frontend/.env.example"
    symbol: "VITE_API_URL"
    line_start: "1"
    line_end: "1"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "frontend/.env.example"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `config.discovered.vite-api-url` represent in ClinicOS?

## Canonical Definition

config.discovered.vite-api-url is the canonical configuration-key named VITE_API_URL.

## Inputs

Environment variable name: `VITE_API_URL`.

## Outputs

Runtime scopes: `["typescript"]`.

## Dependencies

Declared in example configuration: `true`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- typescript

## Invariants

Security classification: browser-visible configuration.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `frontend/.env.example:1-1` — VITE_API_URL

## Related Knowledge

- `belongs-to` → `system.clinicos`
