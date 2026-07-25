---
id: "data.migration.20260708120000-therapy-giorni-settimana"
kind: "database-migration"
title: "20260708120000_therapy_giorni_settimana"
status: "observed"
summary: "Ordered SQL migration 20260708120000_therapy_giorni_settimana."
bounded_contexts: []
sources:
  - path: "prisma/migrations/20260708120000_therapy_giorni_settimana/migration.sql"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/migrations/20260708120000_therapy_giorni_settimana/migration.sql"
    confidence: "observed"
tags:
  - "migration"
  - "non-destructive"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `data.migration.20260708120000-therapy-giorni-settimana` represent in ClinicOS?

## Canonical Definition

data.migration.20260708120000-therapy-giorni-settimana is the canonical database-migration named 20260708120000_therapy_giorni_settimana.

## Inputs

Migration order: `20260708120000_therapy_giorni_settimana`.

## Outputs

- 1. `sql-statement`
- 2. `sql-statement`

## Dependencies

Applied against the preceding migration state and reconciled with the current Prisma schema.

## Side Effects

Mutates PostgreSQL schema and, where encoded by SQL, stored data.

## Consumers

Prisma deployment and backend startup migration command.

## Invariants

Destructive classification: `false`.

## Failure Modes

SQL execution failure, incompatible existing data, violated constraints, or deployment interruption.

## Evidence

- `prisma/migrations/20260708120000_therapy_giorni_settimana/migration.sql`

## Related Knowledge

- `belongs-to` → `project.prisma`
