---
id: "config.discovered.ai-extraction-schema-path"
kind: "configuration-key"
title: "AI_EXTRACTION_SCHEMA_PATH"
status: "observed"
summary: "Configuration key AI_EXTRACTION_SCHEMA_PATH; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_EXTRACTION_SCHEMA_PATH"
    line_start: "27"
    line_end: "27"
    confidence: "observed"
  - path: "backend/src/ai/__tests__/config.test.ts"
    symbol: "AI_EXTRACTION_SCHEMA_PATH"
    line_start: "23"
    line_end: "23"
    confidence: "observed"
  - path: "backend/src/ai/config.ts"
    symbol: "AI_EXTRACTION_SCHEMA_PATH"
    line_start: "73"
    line_end: "73"
    confidence: "observed"
  - path: "backend/src/ai/types.ts"
    symbol: "AI_EXTRACTION_SCHEMA_PATH"
    line_start: "21"
    line_end: "21"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/ai-extraction-schema-path-bdb2ef86b7af.md"
    symbol: "AI_EXTRACTION_SCHEMA_PATH"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/.env.example,backend/src/ai/__tests__/config.test.ts,backend/src/ai/config.ts,backend/src/ai/types.ts,docs/nhw/09-configuration/keys/ai-extraction-schema-path-bdb2ef86b7af.md"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `config.discovered.ai-extraction-schema-path` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-extraction-schema-path is the canonical configuration-key named AI_EXTRACTION_SCHEMA_PATH.

## Inputs

Environment variable name: `AI_EXTRACTION_SCHEMA_PATH`.

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

- `backend/.env.example:27-27` — AI_EXTRACTION_SCHEMA_PATH
- `backend/src/ai/__tests__/config.test.ts:23-23` — AI_EXTRACTION_SCHEMA_PATH
- `backend/src/ai/config.ts:73-73` — AI_EXTRACTION_SCHEMA_PATH
- `backend/src/ai/types.ts:21-21` — AI_EXTRACTION_SCHEMA_PATH
- `docs/nhw/09-configuration/keys/ai-extraction-schema-path-bdb2ef86b7af.md:4-4` — AI_EXTRACTION_SCHEMA_PATH

## Related Knowledge

- `belongs-to` → `system.clinicos`
