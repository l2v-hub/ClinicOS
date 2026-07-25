---
id: "config.discovered.e2e-base-url"
kind: "configuration-key"
title: "E2E_BASE_URL"
status: "observed"
summary: "Configuration key E2E_BASE_URL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "docs/nhw/09-configuration/keys/e2e-base-url-7ec522e84b93.md"
    symbol: "E2E_BASE_URL"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "e2e/therapy-import.spec.ts"
    symbol: "E2E_BASE_URL"
    line_start: "8"
    line_end: "8"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/nhw/09-configuration/keys/e2e-base-url-7ec522e84b93.md,e2e/therapy-import.spec.ts"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `config.discovered.e2e-base-url` represent in ClinicOS?

## Canonical Definition

config.discovered.e2e-base-url is the canonical configuration-key named E2E_BASE_URL.

## Inputs

Environment variable name: `E2E_BASE_URL`.

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

- `docs/nhw/09-configuration/keys/e2e-base-url-7ec522e84b93.md:4-4` — E2E_BASE_URL
- `e2e/therapy-import.spec.ts:8-8` — E2E_BASE_URL

## Related Knowledge

- `belongs-to` → `system.clinicos`
