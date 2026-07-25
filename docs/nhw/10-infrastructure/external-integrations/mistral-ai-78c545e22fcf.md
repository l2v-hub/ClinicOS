---
id: "integration.mistral-ai"
kind: "model-provider-integration"
title: "Mistral model and OCR provider"
status: "observed"
summary: "AI runtime uses the Mistral adapter for configured OCR, extraction, repair, or assistant roles."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/models/env_config.py"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py,clinicos-ai-runtime/clinicos_ai/models/env_config.py"
    confidence: "observed"
tags:
  - "model-provider-integration"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `integration.mistral-ai` represent in ClinicOS?

## Canonical Definition

integration.mistral-ai is the canonical model-provider-integration named Mistral model and OCR provider.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

AI runtime uses the Mistral adapter for configured OCR, extraction, repair, or assistant roles.

## Dependencies

Owning knowledge target: `project.clinicos-ai-runtime`.

## Side Effects

Sends configured model and document requests to Mistral.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/providers/mistral.py`
- `clinicos-ai-runtime/clinicos_ai/models/env_config.py`

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
