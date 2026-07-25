---
id: "value.api.authentication-contract"
kind: "api-contract"
title: "Authentication request contract"
status: "observed"
summary: "Browser-to-backend identity uses Entra bearer tokens when configured and explicit demo headers only in allowed demo mode."
bounded_contexts: []
sources:
  - path: "frontend/src/lib/entraAuth.ts"
    confidence: "observed"
  - path: "backend/src/lib/entra-auth.ts"
    confidence: "observed"
  - path: "backend/src/routes/patient-documents.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "frontend/src/lib/entraAuth.ts,backend/src/lib/entra-auth.ts,backend/src/routes/patient-documents.ts"
    confidence: "observed"
tags:
  - "api-contract"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `value.api.authentication-contract` represent in ClinicOS?

## Canonical Definition

value.api.authentication-contract is the canonical api-contract named Authentication request contract.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Browser-to-backend identity uses Entra bearer tokens when configured and explicit demo headers only in allowed demo mode.

## Dependencies

Owning knowledge target: `system.clinicos`.

## Side Effects

Constructs request headers and resolves server-side operator context.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `frontend/src/lib/entraAuth.ts`
- `backend/src/lib/entra-auth.ts`
- `backend/src/routes/patient-documents.ts`

## Related Knowledge

- `belongs-to` → `system.clinicos`
