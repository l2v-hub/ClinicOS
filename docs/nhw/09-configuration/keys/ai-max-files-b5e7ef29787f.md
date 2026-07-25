---
id: "config.discovered.ai-max-files"
kind: "configuration-key"
title: "AI_MAX_FILES"
status: "observed"
summary: "Configuration key AI_MAX_FILES; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_MAX_FILES"
    line_start: "32"
    line_end: "32"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/.env.example"
    confidence: "observed"
tags:
  - "configuration"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `config.discovered.ai-max-files` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-max-files is the canonical configuration-key named AI_MAX_FILES.

## Inputs

Environment variable name: `AI_MAX_FILES`.

## Outputs

Runtime scopes: None observed.

## Dependencies

Declared in example configuration: `true`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

None observed

## Invariants

Security classification: runtime configuration.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `backend/.env.example:32-32` — AI_MAX_FILES

## Related Knowledge

- `belongs-to` → `system.clinicos`
