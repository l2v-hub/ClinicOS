---
id: 'runtime.backend.ai-upload-worker'
kind: 'background-worker'
title: 'AI upload worker'
status: 'observed'
summary: 'Backend worker claims and processes persisted AI extraction jobs.'
bounded_contexts: []
sources:
  - path: 'backend/src/ai/upload/worker.ts'
    confidence: 'observed'
  - path: 'backend/src/ai/upload/job-service.ts'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/upload/worker.ts,backend/src/ai/upload/job-service.ts'
    confidence: 'observed'
tags:
  - 'background-worker'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `runtime.backend.ai-upload-worker` represent in ClinicOS?

## Canonical Definition

runtime.backend.ai-upload-worker is the canonical background-worker named AI upload worker.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Backend worker claims and processes persisted AI extraction jobs.

## Dependencies

Owning knowledge target: `project.backend`.

## Side Effects

Transitions job state, invokes the AI runtime, persists results, retries, and audit data.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/ai/upload/worker.ts`
- `backend/src/ai/upload/job-service.ts`

## Related Knowledge

- `belongs-to` → `project.backend`
