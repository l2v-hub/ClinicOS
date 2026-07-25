---
id: "config.discovered.ai-require-tool-calling"
kind: "configuration-key"
title: "AI_REQUIRE_TOOL_CALLING"
status: "observed"
summary: "Configuration key AI_REQUIRE_TOOL_CALLING; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/.env.example"
    symbol: "AI_REQUIRE_TOOL_CALLING"
    line_start: "53"
    line_end: "53"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `config.discovered.ai-require-tool-calling` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-require-tool-calling is the canonical configuration-key named AI_REQUIRE_TOOL_CALLING.

## Inputs

Environment variable name: `AI_REQUIRE_TOOL_CALLING`.

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

- `clinicos-ai-runtime/.env.example:53-53` — AI_REQUIRE_TOOL_CALLING

## Related Knowledge

- `belongs-to` → `system.clinicos`
