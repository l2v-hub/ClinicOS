---
id: "runtime.backend.error-handling"
kind: "runtime-error-policy"
title: "Backend error handling"
status: "observed"
summary: "Route-local catch blocks convert validation, persistence, integration, and unknown failures into HTTP responses."
bounded_contexts: []
sources:
  - path: "backend/src/app.ts"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    confidence: "observed"
  - path: "backend/src/routes/ai-jobs.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/app.ts,backend/src/routes/patients.ts,backend/src/routes/ai-jobs.ts"
    confidence: "observed"
tags:
  - "runtime-error-policy"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `runtime.backend.error-handling` represent in ClinicOS?

## Canonical Definition

runtime.backend.error-handling is the canonical runtime-error-policy named Backend error handling.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Route-local catch blocks convert validation, persistence, integration, and unknown failures into HTTP responses.

## Dependencies

Owning knowledge target: `project.backend`.

## Side Effects

Writes HTTP error responses and operational console diagnostics.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/app.ts`
- `backend/src/routes/patients.ts`
- `backend/src/routes/ai-jobs.ts`

## Related Knowledge

- `belongs-to` → `project.backend`
