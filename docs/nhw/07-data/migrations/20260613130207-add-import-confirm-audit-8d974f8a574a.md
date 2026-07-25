---
id: "data.migration.20260613130207-add-import-confirm-audit"
kind: "database-migration"
title: "20260613130207_add_import_confirm_audit"
status: "observed"
summary: "Ordered SQL migration 20260613130207_add_import_confirm_audit."
bounded_contexts: []
sources:
  - path: "prisma/migrations/20260613130207_add_import_confirm_audit/migration.sql"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/migrations/20260613130207_add_import_confirm_audit/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.importaudit"
    evidence: "prisma/migrations/20260613130207_add_import_confirm_audit/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.importjob"
    evidence: "prisma/migrations/20260613130207_add_import_confirm_audit/migration.sql"
    confidence: "observed"
tags:
  - "migration"
  - "non-destructive"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `data.migration.20260613130207-add-import-confirm-audit` represent in ClinicOS?

## Canonical Definition

data.migration.20260613130207-add-import-confirm-audit is the canonical database-migration named 20260613130207_add_import_confirm_audit.

## Inputs

Migration order: `20260613130207_add_import_confirm_audit`.

## Outputs

- 1. `add-column` on `ImportJob`
- 2. `create-table` on `ImportAudit`
- 3. `create-index` on `ImportAudit_jobId_idx`
- 4. `create-index` on `ImportAudit_patientId_idx`
- 5. `create-index` on `ImportJob_createdPatientId_idx`
- 6. `add-constraint` on `ImportAudit`

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

- `prisma/migrations/20260613130207_add_import_confirm_audit/migration.sql`

## Related Knowledge

- `belongs-to` → `project.prisma`
- `writes` → `data.model.importaudit`
- `writes` → `data.model.importjob`
