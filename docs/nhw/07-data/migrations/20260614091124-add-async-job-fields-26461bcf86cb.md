---
id: "data.migration.20260614091124-add-async-job-fields"
kind: "database-migration"
title: "20260614091124_add_async_job_fields"
status: "observed"
summary: "Ordered SQL migration 20260614091124_add_async_job_fields."
bounded_contexts: []
sources:
  - path: "prisma/migrations/20260614091124_add_async_job_fields/migration.sql"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/migrations/20260614091124_add_async_job_fields/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.importdocument"
    evidence: "prisma/migrations/20260614091124_add_async_job_fields/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.importjob"
    evidence: "prisma/migrations/20260614091124_add_async_job_fields/migration.sql"
    confidence: "observed"
tags:
  - "migration"
  - "non-destructive"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `data.migration.20260614091124-add-async-job-fields` represent in ClinicOS?

## Canonical Definition

data.migration.20260614091124-add-async-job-fields is the canonical database-migration named 20260614091124_add_async_job_fields.

## Inputs

Migration order: `20260614091124_add_async_job_fields`.

## Outputs

- 1. `add-column` on `ImportDocument`
- 2. `add-column` on `ImportJob`

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

- `prisma/migrations/20260614091124_add_async_job_fields/migration.sql`

## Related Knowledge

- `belongs-to` → `project.prisma`
- `writes` → `data.model.importdocument`
- `writes` → `data.model.importjob`
