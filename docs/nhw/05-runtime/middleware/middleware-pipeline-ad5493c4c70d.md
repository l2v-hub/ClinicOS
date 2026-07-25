---
id: "runtime.backend.middleware-pipeline"
kind: "runtime-middleware"
title: "Express middleware and route order"
status: "observed"
summary: "Express composition root applies CORS, JSON parsing, health, route modules, and error behavior in source order."
bounded_contexts: []
sources:
  - path: "backend/src/app.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/app.ts"
    confidence: "observed"
tags:
  - "runtime-middleware"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `runtime.backend.middleware-pipeline` represent in ClinicOS?

## Canonical Definition

runtime.backend.middleware-pipeline is the canonical runtime-middleware named Express middleware and route order.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Express composition root applies CORS, JSON parsing, health, route modules, and error behavior in source order.

## Dependencies

Owning knowledge target: `project.backend`.

## Side Effects

Applies origin policy, parses request bodies, and dispatches mounted routers.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/app.ts`

## Related Knowledge

- `belongs-to` → `project.backend`
