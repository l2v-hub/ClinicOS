---
id: "config.discovered.base-url"
kind: "configuration-key"
title: "BASE_URL"
status: "observed"
summary: "Configuration key BASE_URL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "docs/nhw/09-configuration/keys/base-url-d14671b75eb2.md"
    symbol: "BASE_URL"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "scripts/e2e-full-patient-api-test.ts"
    symbol: "BASE_URL"
    line_start: "9"
    line_end: "9"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/nhw/09-configuration/keys/base-url-d14671b75eb2.md,scripts/e2e-full-patient-api-test.ts"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `config.discovered.base-url` represent in ClinicOS?

## Canonical Definition

config.discovered.base-url is the canonical configuration-key named BASE_URL.

## Inputs

Environment variable name: `BASE_URL`.

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

- `docs/nhw/09-configuration/keys/base-url-d14671b75eb2.md:4-4` — BASE_URL
- `scripts/e2e-full-patient-api-test.ts:9-9` — BASE_URL

## Related Knowledge

- `belongs-to` → `system.clinicos`
