---
id: "config.discovered.ai-repair-model"
kind: "configuration-key"
title: "AI_REPAIR_MODEL"
status: "observed"
summary: "Configuration key AI_REPAIR_MODEL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/.env.example"
    symbol: "AI_REPAIR_MODEL"
    line_start: "36"
    line_end: "36"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "clinicos-ai-runtime/.env.example"
    confidence: "observed"
tags:
  - "configuration"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `config.discovered.ai-repair-model` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-repair-model is the canonical configuration-key named AI_REPAIR_MODEL.

## Inputs

Environment variable name: `AI_REPAIR_MODEL`.

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

- `clinicos-ai-runtime/.env.example:36-36` — AI_REPAIR_MODEL

## Related Knowledge

- `belongs-to` → `system.clinicos`
