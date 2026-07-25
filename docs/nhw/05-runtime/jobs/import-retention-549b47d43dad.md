---
id: "runtime.backend.import-retention"
kind: "scheduled-job"
title: "Import-job retention sweep"
status: "observed"
summary: "Backend startup and a manual endpoint trigger best-effort deletion of expired import jobs."
bounded_contexts: []
sources:
  - path: "backend/src/server.ts"
    confidence: "observed"
  - path: "backend/src/routes/ai-jobs.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/server.ts,backend/src/routes/ai-jobs.ts"
    confidence: "observed"
tags:
  - "scheduled-job"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `runtime.backend.import-retention` represent in ClinicOS?

## Canonical Definition

runtime.backend.import-retention is the canonical scheduled-job named Import-job retention sweep.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Backend startup and a manual endpoint trigger best-effort deletion of expired import jobs.

## Dependencies

Owning knowledge target: `project.backend`.

## Side Effects

Deletes or expires import-job state according to retention policy.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/server.ts`
- `backend/src/routes/ai-jobs.ts`

## Related Knowledge

- `belongs-to` → `project.backend`
