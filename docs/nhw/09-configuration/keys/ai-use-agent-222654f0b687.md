---
id: "config.discovered.ai-use-agent"
kind: "configuration-key"
title: "AI_USE_AGENT"
status: "observed"
summary: "Configuration key AI_USE_AGENT; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_USE_AGENT"
    line_start: "44"
    line_end: "44"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `config.discovered.ai-use-agent` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-use-agent is the canonical configuration-key named AI_USE_AGENT.

## Inputs

Environment variable name: `AI_USE_AGENT`.

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

- `backend/.env.example:44-44` — AI_USE_AGENT

## Related Knowledge

- `belongs-to` → `system.clinicos`
