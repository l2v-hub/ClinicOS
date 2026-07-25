---
id: "value.api.internal-gateway-permission"
kind: "permission-contract"
title: "Internal clinical data gateway permission"
status: "observed"
summary: "The AI runtime has no generic database path; it reaches allowlisted backend gateway operations with service and user context."
bounded_contexts: []
sources:
  - path: "backend/src/routes/internal-ai.ts"
    confidence: "observed"
  - path: "backend/src/ai/gateway/query/validate.ts"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.ai-assistance"
    evidence: "backend/src/routes/internal-ai.ts,backend/src/ai/gateway/query/validate.ts,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
tags:
  - "permission-contract"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `value.api.internal-gateway-permission` represent in ClinicOS?

## Canonical Definition

value.api.internal-gateway-permission is the canonical permission-contract named Internal clinical data gateway permission.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

The AI runtime has no generic database path; it reaches allowlisted backend gateway operations with service and user context.

## Dependencies

Owning knowledge target: `context.ai-assistance`.

## Side Effects

Authorizes bounded clinical reads and records gateway audit outcomes.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/routes/internal-ai.ts`
- `backend/src/ai/gateway/query/validate.ts`
- `clinicos-ai-runtime/clinicos_ai/api/app.py`

## Related Knowledge

- `belongs-to` → `context.ai-assistance`
