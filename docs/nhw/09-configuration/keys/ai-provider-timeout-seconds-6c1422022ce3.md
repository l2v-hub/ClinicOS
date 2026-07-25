---
id: "config.discovered.ai-provider-timeout-seconds"
kind: "configuration-key"
title: "AI_PROVIDER_TIMEOUT_SECONDS"
status: "observed"
summary: "Configuration key AI_PROVIDER_TIMEOUT_SECONDS; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/.env.example"
    symbol: "AI_PROVIDER_TIMEOUT_SECONDS"
    line_start: "47"
    line_end: "47"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `config.discovered.ai-provider-timeout-seconds` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-provider-timeout-seconds is the canonical configuration-key named AI_PROVIDER_TIMEOUT_SECONDS.

## Inputs

Environment variable name: `AI_PROVIDER_TIMEOUT_SECONDS`.

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

- `clinicos-ai-runtime/.env.example:47-47` — AI_PROVIDER_TIMEOUT_SECONDS

## Related Knowledge

- `belongs-to` → `system.clinicos`
