---
id: "config.discovered.vite-entra-client-id"
kind: "configuration-key"
title: "VITE_ENTRA_CLIENT_ID"
status: "observed"
summary: "Configuration key VITE_ENTRA_CLIENT_ID; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "docs/entra-setup.md"
    symbol: "VITE_ENTRA_CLIENT_ID"
    line_start: "42"
    line_end: "42"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/vite-entra-client-id-2bb0f766b615.md"
    symbol: "VITE_ENTRA_CLIENT_ID"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "frontend/src/lib/entraAuth.ts"
    symbol: "VITE_ENTRA_CLIENT_ID"
    line_start: "2"
    line_end: "2"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/entra-setup.md,docs/nhw/09-configuration/keys/vite-entra-client-id-2bb0f766b615.md,frontend/src/lib/entraAuth.ts"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `config.discovered.vite-entra-client-id` represent in ClinicOS?

## Canonical Definition

config.discovered.vite-entra-client-id is the canonical configuration-key named VITE_ENTRA_CLIENT_ID.

## Inputs

Environment variable name: `VITE_ENTRA_CLIENT_ID`.

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

- `docs/entra-setup.md:42-42` — VITE_ENTRA_CLIENT_ID
- `docs/nhw/09-configuration/keys/vite-entra-client-id-2bb0f766b615.md:4-4` — VITE_ENTRA_CLIENT_ID
- `frontend/src/lib/entraAuth.ts:2-2` — VITE_ENTRA_CLIENT_ID

## Related Knowledge

- `belongs-to` → `system.clinicos`
