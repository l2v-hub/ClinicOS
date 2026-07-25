---
id: "config.discovered.port"
kind: "configuration-key"
title: "PORT"
status: "observed"
summary: "Configuration key PORT; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "PORT"
    line_start: "2"
    line_end: "2"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/main.py"
    symbol: "PORT"
    line_start: "7"
    line_end: "7"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/.env.example,clinicos-ai-runtime/clinicos_ai/main.py"
    confidence: "observed"
tags:
  - "configuration"
  - "python"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `config.discovered.port` represent in ClinicOS?

## Canonical Definition

config.discovered.port is the canonical configuration-key named PORT.

## Inputs

Environment variable name: `PORT`.

## Outputs

Runtime scopes: `["python","typescript"]`.

## Dependencies

Declared in example configuration: `true`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- python
- typescript

## Invariants

Security classification: runtime configuration.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `backend/.env.example:2-2` — PORT
- `clinicos-ai-runtime/clinicos_ai/main.py:7-7` — PORT

## Related Knowledge

- `belongs-to` → `system.clinicos`
