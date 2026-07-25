---
id: 'config.discovered.ai-extraction-prompt-path'
kind: 'configuration-key'
title: 'AI_EXTRACTION_PROMPT_PATH'
status: 'observed'
summary: 'Configuration key AI_EXTRACTION_PROMPT_PATH; generated knowledge never includes its value.'
bounded_contexts: []
sources:
  - path: 'backend/.env.example'
    symbol: 'AI_EXTRACTION_PROMPT_PATH'
    line_start: '28'
    line_end: '28'
    confidence: 'observed'
  - path: 'backend/src/ai/__tests__/config.test.ts'
    symbol: 'AI_EXTRACTION_PROMPT_PATH'
    line_start: '24'
    line_end: '24'
    confidence: 'observed'
  - path: 'backend/src/ai/config.ts'
    symbol: 'AI_EXTRACTION_PROMPT_PATH'
    line_start: '74'
    line_end: '74'
    confidence: 'observed'
  - path: 'backend/src/ai/types.ts'
    symbol: 'AI_EXTRACTION_PROMPT_PATH'
    line_start: '23'
    line_end: '23'
    confidence: 'observed'
  - path: 'docs/nhw/09-configuration/keys/ai-extraction-prompt-path-46fb60007b89.md'
    symbol: 'AI_EXTRACTION_PROMPT_PATH'
    line_start: '4'
    line_end: '4'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'backend/.env.example,backend/src/ai/__tests__/config.test.ts,backend/src/ai/config.ts,backend/src/ai/types.ts,docs/nhw/09-configuration/keys/ai-extraction-prompt-path-46fb60007b89.md'
    confidence: 'observed'
tags:
  - 'configuration'
  - 'typescript'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `config.discovered.ai-extraction-prompt-path` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-extraction-prompt-path is the canonical configuration-key named AI_EXTRACTION_PROMPT_PATH.

## Inputs

Environment variable name: `AI_EXTRACTION_PROMPT_PATH`.

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

- `backend/.env.example:28-28` — AI_EXTRACTION_PROMPT_PATH
- `backend/src/ai/__tests__/config.test.ts:24-24` — AI_EXTRACTION_PROMPT_PATH
- `backend/src/ai/config.ts:74-74` — AI_EXTRACTION_PROMPT_PATH
- `backend/src/ai/types.ts:23-23` — AI_EXTRACTION_PROMPT_PATH
- `docs/nhw/09-configuration/keys/ai-extraction-prompt-path-46fb60007b89.md:4-4` — AI_EXTRACTION_PROMPT_PATH

## Related Knowledge

- `belongs-to` → `system.clinicos`
