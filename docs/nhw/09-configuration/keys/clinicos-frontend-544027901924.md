---
id: "config.discovered.clinicos-frontend"
kind: "configuration-key"
title: "CLINICOS_FRONTEND"
status: "observed"
summary: "Configuration key CLINICOS_FRONTEND; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: ".claude/skills/run-clinicos/driver.mjs"
    symbol: "CLINICOS_FRONTEND"
    line_start: "19"
    line_end: "19"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/clinicos-frontend-544027901924.md"
    symbol: "CLINICOS_FRONTEND"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "e2e/agnos-cru.mjs"
    symbol: "CLINICOS_FRONTEND"
    line_start: "16"
    line_end: "16"
    confidence: "observed"
  - path: "e2e/agnos-llm-reads.mjs"
    symbol: "CLINICOS_FRONTEND"
    line_start: "12"
    line_end: "12"
    confidence: "observed"
  - path: "e2e/issue-127-verify.mjs"
    symbol: "CLINICOS_FRONTEND"
    line_start: "10"
    line_end: "10"
    confidence: "observed"
  - path: "e2e/issue-128-verify.mjs"
    symbol: "CLINICOS_FRONTEND"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "e2e/issue-130-repro.mjs"
    symbol: "CLINICOS_FRONTEND"
    line_start: "6"
    line_end: "6"
    confidence: "observed"
  - path: "e2e/issue-130-verify.mjs"
    symbol: "CLINICOS_FRONTEND"
    line_start: "5"
    line_end: "5"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".claude/skills/run-clinicos/driver.mjs,docs/nhw/09-configuration/keys/clinicos-frontend-544027901924.md,e2e/agnos-cru.mjs,e2e/agnos-llm-reads.mjs,e2e/issue-127-verify.mjs,e2e/issue-128-verify.mjs,e2e/issue-130-repro.mjs,e2e/issue-130-verify.mjs"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `config.discovered.clinicos-frontend` represent in ClinicOS?

## Canonical Definition

config.discovered.clinicos-frontend is the canonical configuration-key named CLINICOS_FRONTEND.

## Inputs

Environment variable name: `CLINICOS_FRONTEND`.

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

- `.claude/skills/run-clinicos/driver.mjs:19-19` — CLINICOS_FRONTEND
- `docs/nhw/09-configuration/keys/clinicos-frontend-544027901924.md:4-4` — CLINICOS_FRONTEND
- `e2e/agnos-cru.mjs:16-16` — CLINICOS_FRONTEND
- `e2e/agnos-llm-reads.mjs:12-12` — CLINICOS_FRONTEND
- `e2e/issue-127-verify.mjs:10-10` — CLINICOS_FRONTEND
- `e2e/issue-128-verify.mjs:4-4` — CLINICOS_FRONTEND
- `e2e/issue-130-repro.mjs:6-6` — CLINICOS_FRONTEND
- `e2e/issue-130-verify.mjs:5-5` — CLINICOS_FRONTEND

## Related Knowledge

- `belongs-to` → `system.clinicos`
