---
id: "config.discovered.vite-entra-api-scope"
kind: "configuration-key"
title: "VITE_ENTRA_API_SCOPE"
status: "observed"
summary: "Configuration key VITE_ENTRA_API_SCOPE; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "docs/entra-setup.md"
    symbol: "VITE_ENTRA_API_SCOPE"
    line_start: "44"
    line_end: "44"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/vite-entra-api-scope-5bbc9451d0dc.md"
    symbol: "VITE_ENTRA_API_SCOPE"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "frontend/src/lib/entraAuth.ts"
    symbol: "VITE_ENTRA_API_SCOPE"
    line_start: "2"
    line_end: "2"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/entra-setup.md,docs/nhw/09-configuration/keys/vite-entra-api-scope-5bbc9451d0dc.md,frontend/src/lib/entraAuth.ts"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `config.discovered.vite-entra-api-scope` represent in ClinicOS?

## Canonical Definition

config.discovered.vite-entra-api-scope is the canonical configuration-key named VITE_ENTRA_API_SCOPE.

## Inputs

Environment variable name: `VITE_ENTRA_API_SCOPE`.

## Outputs

Runtime scopes: `["typescript"]`.

## Dependencies

Declared in example configuration: `false`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- typescript

## Invariants

Security classification: browser-visible configuration.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `docs/entra-setup.md:44-44` — VITE_ENTRA_API_SCOPE
- `docs/nhw/09-configuration/keys/vite-entra-api-scope-5bbc9451d0dc.md:4-4` — VITE_ENTRA_API_SCOPE
- `frontend/src/lib/entraAuth.ts:2-2` — VITE_ENTRA_API_SCOPE

## Related Knowledge

- `belongs-to` → `system.clinicos`
