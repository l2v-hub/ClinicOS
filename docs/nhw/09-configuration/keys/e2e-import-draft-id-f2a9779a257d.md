---
id: "config.discovered.e2e-import-draft-id"
kind: "configuration-key"
title: "E2E_IMPORT_DRAFT_ID"
status: "observed"
summary: "Configuration key E2E_IMPORT_DRAFT_ID; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "docs/nhw/09-configuration/keys/e2e-import-draft-id-f2a9779a257d.md"
    symbol: "E2E_IMPORT_DRAFT_ID"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "docs/qa/issues/156/validation-report.md"
    symbol: "E2E_IMPORT_DRAFT_ID"
    line_start: "20"
    line_end: "20"
    confidence: "observed"
  - path: "e2e/therapy-import.spec.ts"
    symbol: "E2E_IMPORT_DRAFT_ID"
    line_start: "9"
    line_end: "9"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/nhw/09-configuration/keys/e2e-import-draft-id-f2a9779a257d.md,docs/qa/issues/156/validation-report.md,e2e/therapy-import.spec.ts"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `config.discovered.e2e-import-draft-id` represent in ClinicOS?

## Canonical Definition

config.discovered.e2e-import-draft-id is the canonical configuration-key named E2E_IMPORT_DRAFT_ID.

## Inputs

Environment variable name: `E2E_IMPORT_DRAFT_ID`.

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

- `docs/nhw/09-configuration/keys/e2e-import-draft-id-f2a9779a257d.md:4-4` — E2E_IMPORT_DRAFT_ID
- `docs/qa/issues/156/validation-report.md:20-20` — E2E_IMPORT_DRAFT_ID
- `e2e/therapy-import.spec.ts:9-9` — E2E_IMPORT_DRAFT_ID

## Related Knowledge

- `belongs-to` → `system.clinicos`
