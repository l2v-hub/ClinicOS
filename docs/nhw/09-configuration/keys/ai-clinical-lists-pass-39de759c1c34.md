---
id: "config.discovered.ai-clinical-lists-pass"
kind: "configuration-key"
title: "AI_CLINICAL_LISTS_PASS"
status: "observed"
summary: "Configuration key AI_CLINICAL_LISTS_PASS; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "AI_CLINICAL_LISTS_PASS"
    line_start: "806"
    line_end: "806"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/ai-clinical-lists-pass-39de759c1c34.md"
    symbol: "AI_CLINICAL_LISTS_PASS"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/ai/upload/job-service.ts,docs/nhw/09-configuration/keys/ai-clinical-lists-pass-39de759c1c34.md"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `config.discovered.ai-clinical-lists-pass` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-clinical-lists-pass is the canonical configuration-key named AI_CLINICAL_LISTS_PASS.

## Inputs

Environment variable name: `AI_CLINICAL_LISTS_PASS`.

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

- `backend/src/ai/upload/job-service.ts:806-806` — AI_CLINICAL_LISTS_PASS
- `docs/nhw/09-configuration/keys/ai-clinical-lists-pass-39de759c1c34.md:4-4` — AI_CLINICAL_LISTS_PASS

## Related Knowledge

- `belongs-to` → `system.clinicos`
