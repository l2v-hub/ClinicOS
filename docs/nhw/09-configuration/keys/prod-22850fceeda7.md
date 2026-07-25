---
id: "config.discovered.prod"
kind: "configuration-key"
title: "PROD"
status: "observed"
summary: "Configuration key PROD; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "agent-team/tests/unit/ci-browser-e2e-config.test.mjs"
    symbol: "PROD"
    line_start: "43"
    line_end: "43"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/prod-22850fceeda7.md"
    symbol: "PROD"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "e2e/prod-agent-check.mjs"
    symbol: "PROD"
    line_start: "1"
    line_end: "1"
    confidence: "observed"
  - path: "e2e/prod-conflict-check.mjs"
    symbol: "PROD"
    line_start: "1"
    line_end: "1"
    confidence: "observed"
  - path: "e2e/prod-real-check.mjs"
    symbol: "PROD"
    line_start: "1"
    line_end: "1"
    confidence: "observed"
  - path: "e2e/prod-runtime-check.mjs"
    symbol: "PROD"
    line_start: "1"
    line_end: "1"
    confidence: "observed"
  - path: "frontend/src/components/shared/intake/intakeDraftApi.ts"
    symbol: "PROD"
    line_start: "11"
    line_end: "11"
    confidence: "observed"
  - path: "frontend/src/config.ts"
    symbol: "PROD"
    line_start: "14"
    line_end: "14"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "agent-team/tests/unit/ci-browser-e2e-config.test.mjs,docs/nhw/09-configuration/keys/prod-22850fceeda7.md,e2e/prod-agent-check.mjs,e2e/prod-conflict-check.mjs,e2e/prod-real-check.mjs,e2e/prod-runtime-check.mjs,frontend/src/components/shared/intake/intakeDraftApi.ts,frontend/src/config.ts"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `config.discovered.prod` represent in ClinicOS?

## Canonical Definition

config.discovered.prod is the canonical configuration-key named PROD.

## Inputs

Environment variable name: `PROD`.

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

- `agent-team/tests/unit/ci-browser-e2e-config.test.mjs:43-43` — PROD
- `docs/nhw/09-configuration/keys/prod-22850fceeda7.md:4-4` — PROD
- `e2e/prod-agent-check.mjs:1-1` — PROD
- `e2e/prod-conflict-check.mjs:1-1` — PROD
- `e2e/prod-real-check.mjs:1-1` — PROD
- `e2e/prod-runtime-check.mjs:1-1` — PROD
- `frontend/src/components/shared/intake/intakeDraftApi.ts:11-11` — PROD
- `frontend/src/config.ts:14-14` — PROD

## Related Knowledge

- `belongs-to` → `system.clinicos`
