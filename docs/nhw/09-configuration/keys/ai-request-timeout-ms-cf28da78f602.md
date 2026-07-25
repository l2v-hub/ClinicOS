---
id: "config.discovered.ai-request-timeout-ms"
kind: "configuration-key"
title: "AI_REQUEST_TIMEOUT_MS"
status: "observed"
summary: "Configuration key AI_REQUEST_TIMEOUT_MS; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_REQUEST_TIMEOUT_MS"
    line_start: "48"
    line_end: "48"
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

What does `config.discovered.ai-request-timeout-ms` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-request-timeout-ms is the canonical configuration-key named AI_REQUEST_TIMEOUT_MS.

## Inputs

Environment variable name: `AI_REQUEST_TIMEOUT_MS`.

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

- `backend/.env.example:48-48` — AI_REQUEST_TIMEOUT_MS

## Related Knowledge

- `belongs-to` → `system.clinicos`
