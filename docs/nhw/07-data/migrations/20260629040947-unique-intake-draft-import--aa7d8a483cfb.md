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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
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
