---
id: "config.discovered.something"
kind: "configuration-key"
title: "SOMETHING"
status: "observed"
summary: "Configuration key SOMETHING; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "docs/nhw/09-configuration/keys/something-5ac4ffd5386c.md"
    symbol: "SOMETHING"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "scripts/security/scan-frontend-secrets.mjs"
    symbol: "SOMETHING"
    line_start: "146"
    line_end: "146"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/nhw/09-configuration/keys/something-5ac4ffd5386c.md,scripts/security/scan-frontend-secrets.mjs"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `config.discovered.something` represent in ClinicOS?

## Canonical Definition

config.discovered.something is the canonical configuration-key named SOMETHING.

## Inputs

Environment variable name: `SOMETHING`.

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

- `docs/nhw/09-configuration/keys/something-5ac4ffd5386c.md:4-4` — SOMETHING
- `scripts/security/scan-frontend-secrets.mjs:146-146` — SOMETHING

## Related Knowledge

- `belongs-to` → `system.clinicos`
