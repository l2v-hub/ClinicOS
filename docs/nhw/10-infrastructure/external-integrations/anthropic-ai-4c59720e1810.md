---
id: "integration.anthropic-ai"
kind: "model-provider-integration"
title: "Anthropic model provider"
status: "observed"
summary: "AI runtime model factory exposes the Anthropic provider through the common provider contract."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/models/factory.py"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py,clinicos-ai-runtime/clinicos_ai/models/factory.py"
    confidence: "observed"
tags:
  - "model-provider-integration"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `integration.anthropic-ai` represent in ClinicOS?

## Canonical Definition

integration.anthropic-ai is the canonical model-provider-integration named Anthropic model provider.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

AI runtime model factory exposes the Anthropic provider through the common provider contract.

## Dependencies

Owning knowledge target: `project.clinicos-ai-runtime`.

## Side Effects

Sends configured model requests to Anthropic.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/providers/anthropic.py`
- `clinicos-ai-runtime/clinicos_ai/models/factory.py`

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
