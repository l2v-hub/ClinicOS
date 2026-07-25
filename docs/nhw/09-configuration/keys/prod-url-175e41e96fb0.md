---
id: "config.discovered.prod-url"
kind: "configuration-key"
title: "PROD_URL"
status: "observed"
summary: "Configuration key PROD_URL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "docs/nhw/09-configuration/keys/prod-url-175e41e96fb0.md"
    symbol: "PROD_URL"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "e2e/prod-camera-verify.mjs"
    symbol: "PROD_URL"
    line_start: "7"
    line_end: "7"
    confidence: "observed"
  - path: "e2e/prod-import-verify.mjs"
    symbol: "PROD_URL"
    line_start: "9"
    line_end: "9"
    confidence: "observed"
  - path: "e2e/prod-multipage-verify.mjs"
    symbol: "PROD_URL"
    line_start: "8"
    line_end: "8"
    confidence: "observed"
  - path: "e2e/prod-persist-verify.mjs"
    symbol: "PROD_URL"
    line_start: "8"
    line_end: "8"
    confidence: "observed"
  - path: "e2e/prod-probe.mjs"
    symbol: "PROD_URL"
    line_start: "7"
    line_end: "7"
    confidence: "observed"
  - path: "requirements/evidence/BUG-046/prod-verify/isolate-narrative.mjs"
    symbol: "PROD_URL"
    line_start: "7"
    line_end: "7"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/nhw/09-configuration/keys/prod-url-175e41e96fb0.md,e2e/prod-camera-verify.mjs,e2e/prod-import-verify.mjs,e2e/prod-multipage-verify.mjs,e2e/prod-persist-verify.mjs,e2e/prod-probe.mjs,requirements/evidence/BUG-046/prod-verify/isolate-narrative.mjs"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `config.discovered.prod-url` represent in ClinicOS?

## Canonical Definition

config.discovered.prod-url is the canonical configuration-key named PROD_URL.

## Inputs

Environment variable name: `PROD_URL`.

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

- `docs/nhw/09-configuration/keys/prod-url-175e41e96fb0.md:4-4` — PROD_URL
- `e2e/prod-camera-verify.mjs:7-7` — PROD_URL
- `e2e/prod-import-verify.mjs:9-9` — PROD_URL
- `e2e/prod-multipage-verify.mjs:8-8` — PROD_URL
- `e2e/prod-persist-verify.mjs:8-8` — PROD_URL
- `e2e/prod-probe.mjs:7-7` — PROD_URL
- `requirements/evidence/BUG-046/prod-verify/isolate-narrative.mjs:7-7` — PROD_URL

## Related Knowledge

- `belongs-to` → `system.clinicos`
