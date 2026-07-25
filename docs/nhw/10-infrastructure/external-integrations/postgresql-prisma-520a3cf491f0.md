---
id: "integration.postgresql-prisma"
kind: "external-integration"
title: "PostgreSQL through Prisma"
status: "observed"
summary: "Express persistence uses Prisma schema/client with the PostgreSQL adapter and connection string."
bounded_contexts: []
sources:
  - path: "prisma/schema.prisma"
    confidence: "observed"
  - path: "backend/src/lib/prisma.ts"
    confidence: "observed"
  - path: "docker-compose.yml"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "prisma/schema.prisma,backend/src/lib/prisma.ts,docker-compose.yml"
    confidence: "observed"
tags:
  - "external-integration"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `integration.postgresql-prisma` represent in ClinicOS?

## Canonical Definition

integration.postgresql-prisma is the canonical external-integration named PostgreSQL through Prisma.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Express persistence uses Prisma schema/client with the PostgreSQL adapter and connection string.

## Dependencies

Owning knowledge target: `project.backend`.

## Side Effects

Reads and mutates ClinicOS relational state.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `prisma/schema.prisma`
- `backend/src/lib/prisma.ts`
- `docker-compose.yml`

## Related Knowledge

- `belongs-to` → `project.backend`
