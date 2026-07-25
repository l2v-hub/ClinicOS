---
id: 'config.discovered.dev'
kind: 'configuration-key'
title: 'DEV'
status: 'observed'
summary: 'Configuration key DEV; generated knowledge never includes its value.'
bounded_contexts: []
sources:
  - path: 'docs/nhw/09-configuration/keys/dev-79de473be42a.md'
    symbol: 'DEV'
    line_start: '4'
    line_end: '4'
    confidence: 'observed'
  - path: 'docs/qa/bug-resolution-report.md'
    symbol: 'DEV'
    line_start: '23'
    line_end: '23'
    confidence: 'observed'
  - path: 'frontend/src/components/shared/DischargeImportModal.tsx'
    symbol: 'DEV'
    line_start: '158'
    line_end: '158'
    confidence: 'observed'
  - path: 'frontend/src/components/shared/sections/__tests__/import-contract.test.ts'
    symbol: 'DEV'
    line_start: '97'
    line_end: '97'
    confidence: 'observed'
  - path: 'requirements/evidence/BUG-050/acceptance-matrix.md'
    symbol: 'DEV'
    line_start: '11'
    line_end: '11'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'docs/nhw/09-configuration/keys/dev-79de473be42a.md,docs/qa/bug-resolution-report.md,frontend/src/components/shared/DischargeImportModal.tsx,frontend/src/components/shared/sections/__tests__/import-contract.test.ts,requirements/evidence/BUG-050/acceptance-matrix.md'
    confidence: 'observed'
tags:
  - 'configuration'
  - 'typescript'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `config.discovered.dev` represent in ClinicOS?

## Canonical Definition

config.discovered.dev is the canonical configuration-key named DEV.

## Inputs

Environment variable name: `DEV`.

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

- `docs/nhw/09-configuration/keys/dev-79de473be42a.md:4-4` — DEV
- `docs/qa/bug-resolution-report.md:23-23` — DEV
- `frontend/src/components/shared/DischargeImportModal.tsx:158-158` — DEV
- `frontend/src/components/shared/sections/__tests__/import-contract.test.ts:97-97` — DEV
- `requirements/evidence/BUG-050/acceptance-matrix.md:11-11` — DEV

## Related Knowledge

- `belongs-to` → `system.clinicos`
