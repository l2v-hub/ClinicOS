---
id: "config.discovered.openai-key"
kind: "configuration-key"
title: "OPENAI_KEY"
status: "observed"
summary: "Configuration key OPENAI_KEY; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "docs/nhw/09-configuration/keys/openai-key-c236b456e142.md"
    symbol: "OPENAI_KEY"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "scripts/security/scan-frontend-secrets.mjs"
    symbol: "OPENAI_KEY"
    line_start: "144"
    line_end: "144"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/nhw/09-configuration/keys/openai-key-c236b456e142.md,scripts/security/scan-frontend-secrets.mjs"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `config.discovered.openai-key` represent in ClinicOS?

## Canonical Definition

config.discovered.openai-key is the canonical configuration-key named OPENAI_KEY.

## Inputs

Environment variable name: `OPENAI_KEY`.

## Outputs

Runtime scopes: `["typescript"]`.

## Dependencies

Declared in example configuration: `false`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- typescript

## Invariants

Security classification: runtime configuration.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `docs/nhw/09-configuration/keys/openai-key-c236b456e142.md:4-4` — OPENAI_KEY
- `scripts/security/scan-frontend-secrets.mjs:144-144` — OPENAI_KEY

## Related Knowledge

- `belongs-to` → `system.clinicos`
