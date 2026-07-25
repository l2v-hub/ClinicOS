---
id: "finding.cycle.prisma-bidirectional-relations"
kind: "architectural-finding"
title: "Bidirectional Prisma relationship cycles"
status: "observed"
summary: "Current Prisma models contain expected bidirectional relation cycles that require cycle-aware graph traversal."
bounded_contexts: []
sources:
  - path: "prisma/schema.prisma"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
tags:
  - "architectural-finding"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `finding.cycle.prisma-bidirectional-relations` represent in ClinicOS?

## Canonical Definition

finding.cycle.prisma-bidirectional-relations is the canonical architectural-finding named Bidirectional Prisma relationship cycles.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Current Prisma models contain expected bidirectional relation cycles that require cycle-aware graph traversal.

## Dependencies

Owning knowledge target: `project.prisma`.

## Side Effects

Naive recursive traversal can revisit models indefinitely without a visited-node guard.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `prisma/schema.prisma`

## Related Knowledge

- `belongs-to` → `project.prisma`
