---
id: 'runtime.frontend.request-cache'
kind: 'runtime-cache'
title: 'Frontend GET request cache'
status: 'observed'
summary: 'Browser request helper deduplicates in-flight GET calls and caches responses for a bounded TTL.'
bounded_contexts: []
sources:
  - path: 'frontend/src/lib/cachedFetch.ts'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/lib/cachedFetch.ts'
    confidence: 'observed'
tags:
  - 'runtime-cache'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `runtime.frontend.request-cache` represent in ClinicOS?

## Canonical Definition

runtime.frontend.request-cache is the canonical runtime-cache named Frontend GET request cache.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Browser request helper deduplicates in-flight GET calls and caches responses for a bounded TTL.

## Dependencies

Owning knowledge target: `project.frontend`.

## Side Effects

Stores process-local browser cache entries and invalidates them by URL prefix.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `frontend/src/lib/cachedFetch.ts`

## Related Knowledge

- `belongs-to` → `project.frontend`
