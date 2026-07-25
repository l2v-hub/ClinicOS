---
id: "runtime.backend.prisma-lifecycle"
kind: "runtime-lifecycle"
title: "Prisma and PostgreSQL lifecycle"
status: "observed"
summary: "A shared Prisma client backed by the PostgreSQL adapter owns backend persistence connections."
bounded_contexts: []
sources:
  - path: "backend/src/lib/prisma.ts"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/lib/prisma.ts,prisma/schema.prisma"
    confidence: "observed"
tags:
  - "runtime-lifecycle"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `runtime.backend.prisma-lifecycle` represent in ClinicOS?

## Canonical Definition

runtime.backend.prisma-lifecycle is the canonical runtime-lifecycle named Prisma and PostgreSQL lifecycle.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

A shared Prisma client backed by the PostgreSQL adapter owns backend persistence connections.

## Dependencies

Owning knowledge target: `project.backend`.

## Side Effects

Creates and reuses the database client and PostgreSQL connection resources.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/lib/prisma.ts`
- `prisma/schema.prisma`

## Related Knowledge

- `belongs-to` → `project.backend`
