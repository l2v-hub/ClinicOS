---
id: "config.discovered.ai-max-extractions-per-5min"
kind: "configuration-key"
title: "AI_MAX_EXTRACTIONS_PER_5MIN"
status: "observed"
summary: "Configuration key AI_MAX_EXTRACTIONS_PER_5MIN; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_MAX_EXTRACTIONS_PER_5MIN"
    line_start: "42"
    line_end: "42"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `config.discovered.ai-max-extractions-per-5min` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-max-extractions-per-5min is the canonical configuration-key named AI_MAX_EXTRACTIONS_PER_5MIN.

## Inputs

Environment variable name: `AI_MAX_EXTRACTIONS_PER_5MIN`.

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

- `backend/.env.example:42-42` — AI_MAX_EXTRACTIONS_PER_5MIN

## Related Knowledge

- `belongs-to` → `system.clinicos`
