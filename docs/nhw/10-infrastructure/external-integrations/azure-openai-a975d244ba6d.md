---
id: "integration.azure-openai"
kind: "model-provider-integration"
title: "Azure OpenAI-compatible provider"
status: "observed"
summary: "AI runtime resolves Azure provider aliases, endpoint, deployment, API version, and capabilities from environment configuration."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/azure.py"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/models/env_config.py"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/azure.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py"
    confidence: "observed"
tags:
  - "model-provider-integration"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `integration.azure-openai` represent in ClinicOS?

## Canonical Definition

integration.azure-openai is the canonical model-provider-integration named Azure OpenAI-compatible provider.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

AI runtime resolves Azure provider aliases, endpoint, deployment, API version, and capabilities from environment configuration.

## Dependencies

Owning knowledge target: `project.clinicos-ai-runtime`.

## Side Effects

Sends configured model requests to the Azure endpoint.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/providers/azure.py`
- `clinicos-ai-runtime/clinicos_ai/models/env_config.py`

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
