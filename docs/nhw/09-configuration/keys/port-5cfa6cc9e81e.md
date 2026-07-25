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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
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
