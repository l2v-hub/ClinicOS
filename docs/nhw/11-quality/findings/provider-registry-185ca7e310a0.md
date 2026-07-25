---
id: 'finding.extension.provider-registry'
kind: 'extension-point'
title: 'AI provider registry extension point'
status: 'inferred'
summary: 'Provider registry and factory contracts permit additional AI provider implementations.'
bounded_contexts: []
sources:
  - path: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py'
    symbol: 'DocumentProfileRegistry'
    line_start: '16'
    line_end: '56'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/env_config.py'
    symbol: 'normalize_provider'
    line_start: '25'
    line_end: '27'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/errors.py'
    symbol: 'ProviderUnavailableError'
    line_start: '45'
    line_end: '47'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/factory.py'
    symbol: 'ModelFactory'
    line_start: '32'
    line_end: '51'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py'
    symbol: 'build'
    line_start: '9'
    line_end: '17'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/providers/azure.py'
    symbol: 'build'
    line_start: '71'
    line_end: '73'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/providers/base.py'
    symbol: 'Attachment'
    line_start: '13'
    line_end: '16'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/providers/base.py'
    symbol: 'BuiltModel'
    line_start: '25'
    line_end: '29'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/providers/base.py'
    symbol: 'ModelRunner'
    line_start: '19'
    line_end: '21'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/providers/_common.py'
    symbol: 'make_built'
    line_start: '47'
    line_end: '49'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/providers/google.py'
    symbol: 'build'
    line_start: '62'
    line_end: '64'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    symbol: 'build'
    line_start: '161'
    line_end: '163'
    confidence: 'observed'
relations:
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-registry.py.documentprofileregistry'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.normalize-provider'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-errors.py.providerunavailableerror'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-factory.py.modelfactory'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-anthropic.py.build'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-azure.py.build'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.attachment'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.builtmodel'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.modelrunner'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-common.py.make-built'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-google.py.build'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-mistral.py.build'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-mock.py.build'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-openai-like.py.build'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-openai.py.build'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-registry.py.modelregistry'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
  - type: 'documents'
    target: 'component.ai-runtime.scripts-nhw-lib-python-extractor.py.is-provider'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/models/errors.py,clinicos-ai-runtime/clinicos_ai/models/factory.py,clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/base.py,clinicos-ai-runtime/clinicos_ai/models/providers/_common.py,clinicos-ai-runtime/clinicos_ai/models/providers/google.py,clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py'
    confidence: 'inferred'
tags:
  - 'extension-point'
  - 'ai-provider'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
inference_rule: 'Public provider, registry, and factory symbols form a substitutable model-provider boundary.'
---

## Question Answered

What does `finding.extension.provider-registry` represent in ClinicOS?

## Canonical Definition

finding.extension.provider-registry is the canonical extension-point named AI provider registry extension point.

## Inputs

Provider name, model specification, credentials by environment, and runtime profile.

## Outputs

Provider adapter satisfying the runtime model contract.

## Dependencies

Provider registry, model specification, and factory components.

## Side Effects

None observed

## Consumers

Assistant and document-processing agents.

## Invariants

Supported providers are selected through explicit registry and configuration validation.

## Failure Modes

Unknown providers or invalid model configuration fail during registry/factory resolution.

## Evidence

- `clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py:16-56` — DocumentProfileRegistry
- `clinicos-ai-runtime/clinicos_ai/models/env_config.py:25-27` — normalize_provider
- `clinicos-ai-runtime/clinicos_ai/models/errors.py:45-47` — ProviderUnavailableError
- `clinicos-ai-runtime/clinicos_ai/models/factory.py:32-51` — ModelFactory
- `clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py:9-17` — build
- `clinicos-ai-runtime/clinicos_ai/models/providers/azure.py:71-73` — build
- `clinicos-ai-runtime/clinicos_ai/models/providers/base.py:13-16` — Attachment
- `clinicos-ai-runtime/clinicos_ai/models/providers/base.py:25-29` — BuiltModel
- `clinicos-ai-runtime/clinicos_ai/models/providers/base.py:19-21` — ModelRunner
- `clinicos-ai-runtime/clinicos_ai/models/providers/_common.py:47-49` — make_built
- `clinicos-ai-runtime/clinicos_ai/models/providers/google.py:62-64` — build
- `clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py:161-163` — build

## Related Knowledge

- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-registry.py.documentprofileregistry`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-env-config.py.normalize-provider`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-errors.py.providerunavailableerror`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-factory.py.modelfactory`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-anthropic.py.build`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-azure.py.build`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.attachment`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.builtmodel`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-base.py.modelrunner`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-common.py.make-built`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-google.py.build`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-mistral.py.build`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-mock.py.build`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-openai-like.py.build`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-providers-openai.py.build`
- `documents` → `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-registry.py.modelregistry`
- `documents` → `component.ai-runtime.scripts-nhw-lib-python-extractor.py.is-provider`
