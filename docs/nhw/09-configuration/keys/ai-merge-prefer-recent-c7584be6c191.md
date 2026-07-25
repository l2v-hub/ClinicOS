---
id: "config.discovered.ai-merge-prefer-recent"
kind: "configuration-key"
title: "AI_MERGE_PREFER_RECENT"
status: "observed"
summary: "Configuration key AI_MERGE_PREFER_RECENT; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_MERGE_PREFER_RECENT"
    line_start: "39"
    line_end: "39"
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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `config.discovered.ai-merge-prefer-recent` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-merge-prefer-recent is the canonical configuration-key named AI_MERGE_PREFER_RECENT.

## Inputs

Environment variable name: `AI_MERGE_PREFER_RECENT`.

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

- `backend/.env.example:39-39` — AI_MERGE_PREFER_RECENT

## Related Knowledge

- `belongs-to` → `system.clinicos`
