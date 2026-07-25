---
id: "integration.azure-entra-id"
kind: "external-integration"
title: "Azure Entra ID and JWKS"
status: "observed"
summary: "Backend verifies Entra JWTs against tenant/audience configuration and remote JWKS with cached resolvers."
bounded_contexts: []
sources:
  - path: "backend/src/lib/entra-auth.ts"
    confidence: "observed"
  - path: "frontend/src/lib/entraAuth.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.identity-access"
    evidence: "backend/src/lib/entra-auth.ts,frontend/src/lib/entraAuth.ts"
    confidence: "observed"
tags:
  - "external-integration"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `integration.azure-entra-id` represent in ClinicOS?

## Canonical Definition

integration.azure-entra-id is the canonical external-integration named Azure Entra ID and JWKS.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Backend verifies Entra JWTs against tenant/audience configuration and remote JWKS with cached resolvers.

## Dependencies

Owning knowledge target: `context.identity-access`.

## Side Effects

Fetches signing keys and maps verified identity claims to persisted users/operators.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/lib/entra-auth.ts`
- `frontend/src/lib/entraAuth.ts`

## Related Knowledge

- `belongs-to` → `context.identity-access`
