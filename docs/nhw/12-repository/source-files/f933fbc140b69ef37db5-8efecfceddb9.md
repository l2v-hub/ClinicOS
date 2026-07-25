---
id: "component.repository.source.f933fbc140b69ef37db5"
kind: "repository-source"
title: "audit.ts"
status: "observed"
summary: "Repository source path backend/src/ai/audit.ts classified as semantic-source."
bounded_contexts: []
sources:
  - path: "backend/src/ai/audit.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/ai/audit.ts"
    confidence: "observed"
tags:
  - "repository-source"
  - "semantic-source"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.repository.source.f933fbc140b69ef37db5` represent in ClinicOS?

## Canonical Definition

component.repository.source.f933fbc140b69ef37db5 is the canonical repository-source named audit.ts.

## Inputs

Path classification: `semantic-source`; reason: `application-source`.

## Outputs

Makes the authored source independently retrievable through its stable knowledge identifier.

## Dependencies

Repository inventory and file hash.

## Side Effects

None observed

## Consumers

Coverage reconciliation, semantic retrieval, and impact analysis.

## Invariants

The file payload remains authoritative; this unit stores metadata and purpose, not a duplicate payload.

## Failure Modes

A changed file hash invalidates stale source evidence until regeneration.

## Evidence

- `backend/src/ai/audit.ts`

## Related Knowledge

- `belongs-to` → `system.clinicos`
