---
id: "config.discovered.ai-agent-model"
kind: "configuration-key"
title: "AI_AGENT_MODEL"
status: "observed"
summary: "Configuration key AI_AGENT_MODEL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_AGENT_MODEL"
    line_start: "45"
    line_end: "45"
    confidence: "observed"
  - path: "clinicos-ai-runtime/.env.example"
    symbol: "AI_AGENT_MODEL"
    line_start: "21"
    line_end: "21"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/.env.example,clinicos-ai-runtime/.env.example"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `config.discovered.ai-agent-model` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-agent-model is the canonical configuration-key named AI_AGENT_MODEL.

## Inputs

Environment variable name: `AI_AGENT_MODEL`.

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

- `backend/.env.example:45-45` — AI_AGENT_MODEL
- `clinicos-ai-runtime/.env.example:21-21` — AI_AGENT_MODEL

## Related Knowledge

- `belongs-to` → `system.clinicos`
