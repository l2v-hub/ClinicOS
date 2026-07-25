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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
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
