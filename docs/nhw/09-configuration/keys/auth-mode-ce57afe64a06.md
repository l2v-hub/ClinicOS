---
id: "config.discovered.auth-mode"
kind: "configuration-key"
title: "AUTH_MODE"
status: "observed"
summary: "Configuration key AUTH_MODE; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AUTH_MODE"
    line_start: "6"
    line_end: "6"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `config.discovered.auth-mode` represent in ClinicOS?

## Canonical Definition

config.discovered.auth-mode is the canonical configuration-key named AUTH_MODE.

## Inputs

Environment variable name: `AUTH_MODE`.

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

- `backend/.env.example:6-6` — AUTH_MODE

## Related Knowledge

- `belongs-to` → `system.clinicos`
