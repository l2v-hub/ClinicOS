---
id: "config.discovered.ai-require-image-input"
kind: "configuration-key"
title: "AI_REQUIRE_IMAGE_INPUT"
status: "observed"
summary: "Configuration key AI_REQUIRE_IMAGE_INPUT; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/.env.example"
    symbol: "AI_REQUIRE_IMAGE_INPUT"
    line_start: "51"
    line_end: "51"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `config.discovered.ai-require-image-input` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-require-image-input is the canonical configuration-key named AI_REQUIRE_IMAGE_INPUT.

## Inputs

Environment variable name: `AI_REQUIRE_IMAGE_INPUT`.

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

- `clinicos-ai-runtime/.env.example:51-51` — AI_REQUIRE_IMAGE_INPUT

## Related Knowledge

- `belongs-to` → `system.clinicos`
