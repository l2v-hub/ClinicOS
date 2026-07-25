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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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
