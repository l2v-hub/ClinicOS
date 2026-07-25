---
id: 'config.discovered.ai-narrative-schema-path'
kind: 'configuration-key'
title: 'AI_NARRATIVE_SCHEMA_PATH'
status: 'observed'
summary: 'Configuration key AI_NARRATIVE_SCHEMA_PATH; generated knowledge never includes its value.'
bounded_contexts: []
sources:
  - path: 'backend/src/ai/sections/narrative.ts'
    symbol: 'AI_NARRATIVE_SCHEMA_PATH'
    line_start: '264'
    line_end: '264'
    confidence: 'observed'
  - path: 'docs/nhw/09-configuration/keys/ai-narrative-schema-path-c8bb58d3034d.md'
    symbol: 'AI_NARRATIVE_SCHEMA_PATH'
    line_start: '4'
    line_end: '4'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'backend/src/ai/sections/narrative.ts,docs/nhw/09-configuration/keys/ai-narrative-schema-path-c8bb58d3034d.md'
    confidence: 'observed'
tags:
  - 'configuration'
  - 'typescript'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `config.discovered.ai-narrative-schema-path` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-narrative-schema-path is the canonical configuration-key named AI_NARRATIVE_SCHEMA_PATH.

## Inputs

Environment variable name: `AI_NARRATIVE_SCHEMA_PATH`.

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

- `backend/src/ai/sections/narrative.ts:264-264` — AI_NARRATIVE_SCHEMA_PATH
- `docs/nhw/09-configuration/keys/ai-narrative-schema-path-c8bb58d3034d.md:4-4` — AI_NARRATIVE_SCHEMA_PATH

## Related Knowledge

- `belongs-to` → `system.clinicos`
