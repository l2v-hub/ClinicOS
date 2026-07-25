---
id: "runtime.backend.express-startup"
kind: "runtime-startup"
title: "Express backend startup"
status: "observed"
summary: "Backend startup resolves the port, starts Express, reports AI status, and schedules retention."
bounded_contexts: []
sources:
  - path: "backend/src/server.ts"
    confidence: "observed"
  - path: "backend/src/app.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/server.ts,backend/src/app.ts"
    confidence: "observed"
tags:
  - "runtime-startup"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `runtime.backend.express-startup` represent in ClinicOS?

## Canonical Definition

runtime.backend.express-startup is the canonical runtime-startup named Express backend startup.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Backend startup resolves the port, starts Express, reports AI status, and schedules retention.

## Dependencies

Owning knowledge target: `project.backend`.

## Side Effects

Binds the HTTP listener and schedules the import-job retention sweep.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/server.ts`
- `backend/src/app.ts`

## Related Knowledge

- `belongs-to` → `project.backend`
