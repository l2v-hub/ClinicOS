---
id: "config.discovered.gemini-api-key"
kind: "configuration-key"
title: "GEMINI_API_KEY"
status: "observed"
summary: "Configuration key GEMINI_API_KEY; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "GEMINI_API_KEY"
    line_start: "25"
    line_end: "25"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `config.discovered.gemini-api-key` represent in ClinicOS?

## Canonical Definition

config.discovered.gemini-api-key is the canonical configuration-key named GEMINI_API_KEY.

## Inputs

Environment variable name: `GEMINI_API_KEY`.

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

- `backend/.env.example:25-25` — GEMINI_API_KEY

## Related Knowledge

- `belongs-to` → `system.clinicos`
