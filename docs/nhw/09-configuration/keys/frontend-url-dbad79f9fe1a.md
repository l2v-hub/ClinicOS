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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
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
