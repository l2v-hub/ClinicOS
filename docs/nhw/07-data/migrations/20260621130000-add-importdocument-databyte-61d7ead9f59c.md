---
id: "data.migration.20260621130000-add-importdocument-databytes"
kind: "database-migration"
title: "20260621130000_add_importdocument_databytes"
status: "observed"
summary: "Ordered SQL migration 20260621130000_add_importdocument_databytes."
bounded_contexts: []
sources:
  - path: "prisma/migrations/20260621130000_add_importdocument_databytes/migration.sql"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/migrations/20260621130000_add_importdocument_databytes/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.importdocument"
    evidence: "prisma/migrations/20260621130000_add_importdocument_databytes/migration.sql"
    confidence: "observed"
tags:
  - "migration"
  - "non-destructive"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `data.migration.20260621130000-add-importdocument-databytes` represent in ClinicOS?

## Canonical Definition

data.migration.20260621130000-add-importdocument-databytes is the canonical database-migration named 20260621130000_add_importdocument_databytes.

## Inputs

Migration order: `20260621130000_add_importdocument_databytes`.

## Outputs

- 1. `add-column` on `ImportDocument`

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

- `prisma/migrations/20260621130000_add_importdocument_databytes/migration.sql`

## Related Knowledge

- `belongs-to` → `project.prisma`
- `writes` → `data.model.importdocument`
