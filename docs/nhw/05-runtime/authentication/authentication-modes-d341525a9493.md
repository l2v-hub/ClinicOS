---
id: "runtime.backend.authentication-modes"
kind: "runtime-authentication"
title: "Demo and Entra authentication modes"
status: "observed"
summary: "Protected document routes select fail-closed, demo, or Entra authentication from AUTH_MODE."
bounded_contexts: []
sources:
  - path: "backend/src/routes/patient-documents.ts"
    confidence: "observed"
  - path: "backend/src/lib/entra-auth.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/lib/entra-auth.ts"
    confidence: "observed"
tags:
  - "runtime-authentication"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `runtime.backend.authentication-modes` represent in ClinicOS?

## Canonical Definition

runtime.backend.authentication-modes is the canonical runtime-authentication named Demo and Entra authentication modes.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Protected document routes select fail-closed, demo, or Entra authentication from AUTH_MODE.

## Dependencies

Owning knowledge target: `project.backend`.

## Side Effects

Resolves verified operator identity and may link Entra object identifiers to users.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/routes/patient-documents.ts`
- `backend/src/lib/entra-auth.ts`

## Related Knowledge

- `belongs-to` → `project.backend`
