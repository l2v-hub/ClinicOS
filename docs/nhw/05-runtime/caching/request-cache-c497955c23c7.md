---
id: "runtime.frontend.request-cache"
kind: "runtime-cache"
title: "Frontend GET request cache"
status: "observed"
summary: "Browser request helper deduplicates in-flight GET calls and caches responses for a bounded TTL."
bounded_contexts: []
sources:
  - path: "frontend/src/lib/cachedFetch.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/cachedFetch.ts"
    confidence: "observed"
tags:
  - "runtime-cache"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
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
