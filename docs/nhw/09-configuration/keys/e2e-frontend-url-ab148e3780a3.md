---
id: "config.discovered.e2e-frontend-url"
kind: "configuration-key"
title: "E2E_FRONTEND_URL"
status: "observed"
summary: "Configuration key E2E_FRONTEND_URL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "docs/nhw/09-configuration/keys/e2e-frontend-url-ab148e3780a3.md"
    symbol: "E2E_FRONTEND_URL"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "e2e/import-happy-path.mjs"
    symbol: "E2E_FRONTEND_URL"
    line_start: "16"
    line_end: "16"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/nhw/09-configuration/keys/e2e-frontend-url-ab148e3780a3.md,e2e/import-happy-path.mjs"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `config.discovered.e2e-frontend-url` represent in ClinicOS?

## Canonical Definition

config.discovered.e2e-frontend-url is the canonical configuration-key named E2E_FRONTEND_URL.

## Inputs

Environment variable name: `E2E_FRONTEND_URL`.

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

- `docs/nhw/09-configuration/keys/e2e-frontend-url-ab148e3780a3.md:4-4` — E2E_FRONTEND_URL
- `e2e/import-happy-path.mjs:16-16` — E2E_FRONTEND_URL

## Related Knowledge

- `belongs-to` → `system.clinicos`
