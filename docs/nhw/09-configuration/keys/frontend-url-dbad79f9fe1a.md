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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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
