---
id: 'config.discovered.azure-openai-api-key'
kind: 'configuration-key'
title: 'AZURE_OPENAI_API_KEY'
status: 'observed'
summary: 'Configuration key AZURE_OPENAI_API_KEY; generated knowledge never includes its value.'
bounded_contexts: []
sources:
  - path: 'clinicos-ai-runtime/.env.example'
    symbol: 'AZURE_OPENAI_API_KEY'
    line_start: '18'
    line_end: '18'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/env_config.py'
    symbol: 'AZURE_OPENAI_API_KEY'
    line_start: '102'
    line_end: '102'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/providers/azure.py'
    symbol: 'AZURE_OPENAI_API_KEY'
    line_start: '2'
    line_end: '2'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/registry.py'
    symbol: 'AZURE_OPENAI_API_KEY'
    line_start: '22'
    line_end: '22'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/tests/test_env_config.py'
    symbol: 'AZURE_OPENAI_API_KEY'
    line_start: '23'
    line_end: '23'
    confidence: 'observed'
  - path: 'docs/agnos-azure-openai-gpt55.md'
    symbol: 'AZURE_OPENAI_API_KEY'
    line_start: '12'
    line_end: '12'
    confidence: 'observed'
  - path: 'docs/azure-backend-config-principles.md'
    symbol: 'AZURE_OPENAI_API_KEY'
    line_start: '22'
    line_end: '22'
    confidence: 'observed'
  - path: 'docs/nhw/09-configuration/keys/azure-openai-api-key-802ae7a4ef2d.md'
    symbol: 'AZURE_OPENAI_API_KEY'
    line_start: '4'
    line_end: '4'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'clinicos-ai-runtime/.env.example,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/registry.py,clinicos-ai-runtime/tests/test_env_config.py,docs/agnos-azure-openai-gpt55.md,docs/azure-backend-config-principles.md,docs/nhw/09-configuration/keys/azure-openai-api-key-802ae7a4ef2d.md'
    confidence: 'observed'
tags:
  - 'configuration'
  - 'typescript'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `config.discovered.azure-openai-api-key` represent in ClinicOS?

## Canonical Definition

config.discovered.azure-openai-api-key is the canonical configuration-key named AZURE_OPENAI_API_KEY.

## Inputs

Environment variable name: `AZURE_OPENAI_API_KEY`.

## Outputs

Runtime scopes: `["typescript"]`.

## Dependencies

Declared in example configuration: `false`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- typescript

## Invariants

Security classification: sensitive-name; value intentionally excluded.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `clinicos-ai-runtime/.env.example:18-18` — AZURE_OPENAI_API_KEY
- `clinicos-ai-runtime/clinicos_ai/models/env_config.py:102-102` — AZURE_OPENAI_API_KEY
- `clinicos-ai-runtime/clinicos_ai/models/providers/azure.py:2-2` — AZURE_OPENAI_API_KEY
- `clinicos-ai-runtime/clinicos_ai/models/registry.py:22-22` — AZURE_OPENAI_API_KEY
- `clinicos-ai-runtime/tests/test_env_config.py:23-23` — AZURE_OPENAI_API_KEY
- `docs/agnos-azure-openai-gpt55.md:12-12` — AZURE_OPENAI_API_KEY
- `docs/azure-backend-config-principles.md:22-22` — AZURE_OPENAI_API_KEY
- `docs/nhw/09-configuration/keys/azure-openai-api-key-802ae7a4ef2d.md:4-4` — AZURE_OPENAI_API_KEY

## Related Knowledge

- `belongs-to` → `system.clinicos`
