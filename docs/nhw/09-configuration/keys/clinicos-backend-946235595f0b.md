---
id: "config.discovered.clinicos-backend"
kind: "configuration-key"
title: "CLINICOS_BACKEND"
status: "observed"
summary: "Configuration key CLINICOS_BACKEND; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: ".claude/skills/run-clinicos/driver.mjs"
    symbol: "CLINICOS_BACKEND"
    line_start: "20"
    line_end: "20"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/clinicos-backend-946235595f0b.md"
    symbol: "CLINICOS_BACKEND"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "e2e/issue-130-verify.mjs"
    symbol: "CLINICOS_BACKEND"
    line_start: "5"
    line_end: "5"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".claude/skills/run-clinicos/driver.mjs,docs/nhw/09-configuration/keys/clinicos-backend-946235595f0b.md,e2e/issue-130-verify.mjs"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `config.discovered.clinicos-backend` represent in ClinicOS?

## Canonical Definition

config.discovered.clinicos-backend is the canonical configuration-key named CLINICOS_BACKEND.

## Inputs

Environment variable name: `CLINICOS_BACKEND`.

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

- `.claude/skills/run-clinicos/driver.mjs:20-20` — CLINICOS_BACKEND
- `docs/nhw/09-configuration/keys/clinicos-backend-946235595f0b.md:4-4` — CLINICOS_BACKEND
- `e2e/issue-130-verify.mjs:5-5` — CLINICOS_BACKEND

## Related Knowledge

- `belongs-to` → `system.clinicos`
