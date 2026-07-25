---
id: "value.api.error-envelope"
kind: "api-contract"
title: "HTTP error envelope"
status: "observed"
summary: "Endpoint failures return status-specific JSON error objects defined by each route family."
bounded_contexts: []
sources:
  - path: "backend/src/routes/patients.ts"
    confidence: "observed"
  - path: "backend/src/routes/ai-assistant-public.ts"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/domain/contracts.py"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/routes/patients.ts,backend/src/routes/ai-assistant-public.ts,clinicos-ai-runtime/clinicos_ai/domain/contracts.py"
    confidence: "observed"
tags:
  - "api-contract"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `value.api.error-envelope` represent in ClinicOS?

## Canonical Definition

value.api.error-envelope is the canonical api-contract named HTTP error envelope.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Endpoint failures return status-specific JSON error objects defined by each route family.

## Dependencies

Owning knowledge target: `system.clinicos`.

## Side Effects

Serializes public failure information while keeping internal credentials and provider details out of responses.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/routes/patients.ts`
- `backend/src/routes/ai-assistant-public.ts`
- `clinicos-ai-runtime/clinicos_ai/domain/contracts.py`

## Related Knowledge

- `belongs-to` → `system.clinicos`
