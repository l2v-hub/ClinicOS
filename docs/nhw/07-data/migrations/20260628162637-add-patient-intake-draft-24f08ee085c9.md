---
id: "data.migration.20260628162637-add-patient-intake-draft"
kind: "database-migration"
title: "20260628162637_add_patient_intake_draft"
status: "observed"
summary: "Ordered SQL migration 20260628162637_add_patient_intake_draft."
bounded_contexts: []
sources:
  - path: "prisma/migrations/20260628162637_add_patient_intake_draft/migration.sql"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/migrations/20260628162637_add_patient_intake_draft/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.patientintakedraft"
    evidence: "prisma/migrations/20260628162637_add_patient_intake_draft/migration.sql"
    confidence: "observed"
tags:
  - "migration"
  - "non-destructive"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `data.migration.20260628162637-add-patient-intake-draft` represent in ClinicOS?

## Canonical Definition

data.migration.20260628162637-add-patient-intake-draft is the canonical database-migration named 20260628162637_add_patient_intake_draft.

## Inputs

Migration order: `20260628162637_add_patient_intake_draft`.

## Outputs

- 1. `create-table` on `PatientIntakeDraft`
- 2. `create-index` on `PatientIntakeDraft_status_idx`
- 3. `create-index` on `PatientIntakeDraft_createdById_idx`

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

- `prisma/migrations/20260628162637_add_patient_intake_draft/migration.sql`

## Related Knowledge

- `belongs-to` → `project.prisma`
- `writes` → `data.model.patientintakedraft`
