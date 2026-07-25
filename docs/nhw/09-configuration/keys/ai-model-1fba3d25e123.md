---
id: "config.discovered.ai-model"
kind: "configuration-key"
title: "AI_MODEL"
status: "observed"
summary: "Configuration key AI_MODEL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_MODEL"
    line_start: "21"
    line_end: "21"
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

What does `config.discovered.ai-model` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-model is the canonical configuration-key named AI_MODEL.

## Inputs

Environment variable name: `AI_MODEL`.

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

- `backend/.env.example:21-21` — AI_MODEL

## Related Knowledge

- `belongs-to` → `system.clinicos`
