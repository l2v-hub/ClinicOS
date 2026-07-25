---
id: "data.migration.20260629040947-unique-intake-draft-import-job"
kind: "database-migration"
title: "20260629040947_unique_intake_draft_import_job"
status: "observed"
summary: "Ordered SQL migration 20260629040947_unique_intake_draft_import_job."
bounded_contexts: []
sources:
  - path: "prisma/migrations/20260629040947_unique_intake_draft_import_job/migration.sql"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/migrations/20260629040947_unique_intake_draft_import_job/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.patientintakedraft"
    evidence: "prisma/migrations/20260629040947_unique_intake_draft_import_job/migration.sql"
    confidence: "observed"
tags:
  - "migration"
  - "non-destructive"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `data.migration.20260629040947-unique-intake-draft-import-job` represent in ClinicOS?

## Canonical Definition

data.migration.20260629040947-unique-intake-draft-import-job is the canonical database-migration named 20260629040947_unique_intake_draft_import_job.

## Inputs

Migration order: `20260629040947_unique_intake_draft_import_job`.

## Outputs

- 1. `create-unique-index` on `PatientIntakeDraft_importJobId_key`

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

- `prisma/migrations/20260629040947_unique_intake_draft_import_job/migration.sql`

## Related Knowledge

- `belongs-to` → `project.prisma`
- `writes` → `data.model.patientintakedraft`
