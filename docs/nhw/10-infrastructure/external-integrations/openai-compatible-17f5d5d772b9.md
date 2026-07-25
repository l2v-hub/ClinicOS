---
id: "integration.openai-compatible"
kind: "model-provider-integration"
title: "OpenAI and OpenAI-compatible providers"
status: "observed"
summary: "AI runtime supports native OpenAI and configurable OpenAI-like endpoints behind the shared model runner contract."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/openai.py"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/openai_like.py"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/openai.py,clinicos-ai-runtime/clinicos_ai/models/providers/openai_like.py"
    confidence: "observed"
tags:
  - "model-provider-integration"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `integration.openai-compatible` represent in ClinicOS?

## Canonical Definition

integration.openai-compatible is the canonical model-provider-integration named OpenAI and OpenAI-compatible providers.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

AI runtime supports native OpenAI and configurable OpenAI-like endpoints behind the shared model runner contract.

## Dependencies

Owning knowledge target: `project.clinicos-ai-runtime`.

## Side Effects

Sends configured requests to native or compatible model endpoints.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/providers/openai.py`
- `clinicos-ai-runtime/clinicos_ai/models/providers/openai_like.py`

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
