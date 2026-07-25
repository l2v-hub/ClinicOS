---
id: "config.discovered.ai-structured-model"
kind: "configuration-key"
title: "AI_STRUCTURED_MODEL"
status: "observed"
summary: "Configuration key AI_STRUCTURED_MODEL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_STRUCTURED_MODEL"
    line_start: "23"
    line_end: "23"
    confidence: "observed"
  - path: "backend/src/ai/__tests__/config.test.ts"
    symbol: "AI_STRUCTURED_MODEL"
    line_start: "18"
    line_end: "18"
    confidence: "observed"
  - path: "backend/src/ai/config.ts"
    symbol: "AI_STRUCTURED_MODEL"
    line_start: "71"
    line_end: "71"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/ai-structured-model-0e45a6f9ad13.md"
    symbol: "AI_STRUCTURED_MODEL"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/.env.example,backend/src/ai/__tests__/config.test.ts,backend/src/ai/config.ts,docs/nhw/09-configuration/keys/ai-structured-model-0e45a6f9ad13.md"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `config.discovered.ai-structured-model` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-structured-model is the canonical configuration-key named AI_STRUCTURED_MODEL.

## Inputs

Environment variable name: `AI_STRUCTURED_MODEL`.

## Outputs

Runtime scopes: `["typescript"]`.

## Dependencies

Declared in example configuration: `false`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- typescript

## Invariants

Security classification: runtime configuration.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `backend/.env.example:23-23` — AI_STRUCTURED_MODEL
- `backend/src/ai/__tests__/config.test.ts:18-18` — AI_STRUCTURED_MODEL
- `backend/src/ai/config.ts:71-71` — AI_STRUCTURED_MODEL
- `docs/nhw/09-configuration/keys/ai-structured-model-0e45a6f9ad13.md:4-4` — AI_STRUCTURED_MODEL

## Related Knowledge

- `belongs-to` → `system.clinicos`
