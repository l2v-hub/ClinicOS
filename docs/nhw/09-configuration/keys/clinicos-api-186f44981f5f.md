---
id: 'config.discovered.clinicos-api'
kind: 'configuration-key'
title: 'CLINICOS_API'
status: 'observed'
summary: 'Configuration key CLINICOS_API; generated knowledge never includes its value.'
bounded_contexts: []
sources:
  - path: 'docs/nhw/09-configuration/keys/clinicos-api-186f44981f5f.md'
    symbol: 'CLINICOS_API'
    line_start: '4'
    line_end: '4'
    confidence: 'observed'
  - path: 'e2e/issue-128-verify.mjs'
    symbol: 'CLINICOS_API'
    line_start: '4'
    line_end: '4'
    confidence: 'observed'
  - path: 'e2e/remediation/issue-245.spec.ts'
    symbol: 'CLINICOS_API'
    line_start: '15'
    line_end: '15'
    confidence: 'observed'
  - path: 'e2e/remediation/issue-246.spec.ts'
    symbol: 'CLINICOS_API'
    line_start: '25'
    line_end: '25'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'docs/nhw/09-configuration/keys/clinicos-api-186f44981f5f.md,e2e/issue-128-verify.mjs,e2e/remediation/issue-245.spec.ts,e2e/remediation/issue-246.spec.ts'
    confidence: 'observed'
tags:
  - 'configuration'
  - 'typescript'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `config.discovered.clinicos-api` represent in ClinicOS?

## Canonical Definition

config.discovered.clinicos-api is the canonical configuration-key named CLINICOS_API.

## Inputs

Environment variable name: `CLINICOS_API`.

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

- `docs/nhw/09-configuration/keys/clinicos-api-186f44981f5f.md:4-4` — CLINICOS_API
- `e2e/issue-128-verify.mjs:4-4` — CLINICOS_API
- `e2e/remediation/issue-245.spec.ts:15-15` — CLINICOS_API
- `e2e/remediation/issue-246.spec.ts:25-25` — CLINICOS_API

## Related Knowledge

- `belongs-to` → `system.clinicos`
