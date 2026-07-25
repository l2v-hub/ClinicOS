---
id: "config.environment.vercel"
kind: "runtime-environment"
title: "Vercel frontend environment"
status: "observed"
summary: "Frontend deployment uses the Vercel project configuration and build-time VITE variables."
bounded_contexts: []
sources:
  - path: "frontend/vercel.json"
    confidence: "observed"
  - path: "frontend/src/config.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/vercel.json,frontend/src/config.ts"
    confidence: "observed"
tags:
  - "runtime-environment"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `config.environment.vercel` represent in ClinicOS?

## Canonical Definition

config.environment.vercel is the canonical runtime-environment named Vercel frontend environment.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Frontend deployment uses the Vercel project configuration and build-time VITE variables.

## Dependencies

Owning knowledge target: `project.frontend`.

## Side Effects

Builds and serves the browser application.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `frontend/vercel.json`
- `frontend/src/config.ts`

## Related Knowledge

- `belongs-to` → `project.frontend`
