---
id: "config.discovered.ai-sections-schema-path"
kind: "configuration-key"
title: "AI_SECTIONS_SCHEMA_PATH"
status: "observed"
summary: "Configuration key AI_SECTIONS_SCHEMA_PATH; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/src/ai/sections/index.ts"
    symbol: "AI_SECTIONS_SCHEMA_PATH"
    line_start: "14"
    line_end: "14"
    confidence: "observed"
  - path: "backend/src/ai/sections/validate.ts"
    symbol: "AI_SECTIONS_SCHEMA_PATH"
    line_start: "28"
    line_end: "28"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/ai-sections-schema-path-f379b6c42aff.md"
    symbol: "AI_SECTIONS_SCHEMA_PATH"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/ai/sections/index.ts,backend/src/ai/sections/validate.ts,docs/nhw/09-configuration/keys/ai-sections-schema-path-f379b6c42aff.md"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `config.discovered.ai-sections-schema-path` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-sections-schema-path is the canonical configuration-key named AI_SECTIONS_SCHEMA_PATH.

## Inputs

Environment variable name: `AI_SECTIONS_SCHEMA_PATH`.

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

- `backend/src/ai/sections/index.ts:14-14` — AI_SECTIONS_SCHEMA_PATH
- `backend/src/ai/sections/validate.ts:28-28` — AI_SECTIONS_SCHEMA_PATH
- `docs/nhw/09-configuration/keys/ai-sections-schema-path-f379b6c42aff.md:4-4` — AI_SECTIONS_SCHEMA_PATH

## Related Knowledge

- `belongs-to` → `system.clinicos`
