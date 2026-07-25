---
id: 'config.discovered.frontend-urls'
kind: 'configuration-key'
title: 'FRONTEND_URLS'
status: 'observed'
summary: 'Configuration key FRONTEND_URLS; generated knowledge never includes its value.'
bounded_contexts: []
sources:
  - path: 'backend/.env.example'
    symbol: 'FRONTEND_URLS'
    line_start: '12'
    line_end: '12'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'backend/.env.example'
    confidence: 'observed'
tags:
  - 'configuration'
  - 'typescript'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `config.discovered.frontend-urls` represent in ClinicOS?

## Canonical Definition

config.discovered.frontend-urls is the canonical configuration-key named FRONTEND_URLS.

## Inputs

Environment variable name: `FRONTEND_URLS`.

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

- `backend/.env.example:12-12` — FRONTEND_URLS

## Related Knowledge

- `belongs-to` → `system.clinicos`
