---
id: "config.discovered.vite-openai-token"
kind: "configuration-key"
title: "VITE_OPENAI_TOKEN"
status: "observed"
summary: "Configuration key VITE_OPENAI_TOKEN; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "docs/nhw/09-configuration/keys/vite-openai-token-9ec544b7af12.md"
    symbol: "VITE_OPENAI_TOKEN"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "scripts/security/scan-frontend-secrets.mjs"
    symbol: "VITE_OPENAI_TOKEN"
    line_start: "138"
    line_end: "138"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/nhw/09-configuration/keys/vite-openai-token-9ec544b7af12.md,scripts/security/scan-frontend-secrets.mjs"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `config.discovered.vite-openai-token` represent in ClinicOS?

## Canonical Definition

config.discovered.vite-openai-token is the canonical configuration-key named VITE_OPENAI_TOKEN.

## Inputs

Environment variable name: `VITE_OPENAI_TOKEN`.

## Outputs

Runtime scopes: `["typescript"]`.

## Dependencies

Declared in example configuration: `false`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- typescript

## Invariants

Security classification: sensitive-name; value intentionally excluded.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `docs/nhw/09-configuration/keys/vite-openai-token-9ec544b7af12.md:4-4` — VITE_OPENAI_TOKEN
- `scripts/security/scan-frontend-secrets.mjs:138-138` — VITE_OPENAI_TOKEN

## Related Knowledge

- `belongs-to` → `system.clinicos`
