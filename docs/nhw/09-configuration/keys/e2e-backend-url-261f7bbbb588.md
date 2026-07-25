---
id: "config.discovered.e2e-backend-url"
kind: "configuration-key"
title: "E2E_BACKEND_URL"
status: "observed"
summary: "Configuration key E2E_BACKEND_URL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "docs/nhw/09-configuration/keys/e2e-backend-url-261f7bbbb588.md"
    symbol: "E2E_BACKEND_URL"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "e2e/import-happy-path.mjs"
    symbol: "E2E_BACKEND_URL"
    line_start: "17"
    line_end: "17"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/nhw/09-configuration/keys/e2e-backend-url-261f7bbbb588.md,e2e/import-happy-path.mjs"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `config.discovered.e2e-backend-url` represent in ClinicOS?

## Canonical Definition

config.discovered.e2e-backend-url is the canonical configuration-key named E2E_BACKEND_URL.

## Inputs

Environment variable name: `E2E_BACKEND_URL`.

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

- `docs/nhw/09-configuration/keys/e2e-backend-url-261f7bbbb588.md:4-4` — E2E_BACKEND_URL
- `e2e/import-happy-path.mjs:17-17` — E2E_BACKEND_URL

## Related Knowledge

- `belongs-to` → `system.clinicos`
