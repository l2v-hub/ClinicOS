---
id: "data.migration.20260510140000-add-patient-intake-document"
kind: "database-migration"
title: "20260510140000_add_patient_intake_document"
status: "observed"
summary: "Ordered SQL migration 20260510140000_add_patient_intake_document."
bounded_contexts: []
sources:
  - path: "prisma/migrations/20260510140000_add_patient_intake_document/migration.sql"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/migrations/20260510140000_add_patient_intake_document/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.patientintakedocument"
    evidence: "prisma/migrations/20260510140000_add_patient_intake_document/migration.sql"
    confidence: "observed"
tags:
  - "migration"
  - "non-destructive"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `data.migration.20260510140000-add-patient-intake-document` represent in ClinicOS?

## Canonical Definition

data.migration.20260510140000-add-patient-intake-document is the canonical database-migration named 20260510140000_add_patient_intake_document.

## Inputs

Migration order: `20260510140000_add_patient_intake_document`.

## Outputs

- 1. `create-table` on `PatientIntakeDocument`
- 2. `create-index` on `PatientIntakeDocument_patientId_idx`
- 3. `create-index` on `PatientIntakeDocument_status_idx`
- 4. `add-constraint` on `PatientIntakeDocument`

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

- `prisma/migrations/20260510140000_add_patient_intake_document/migration.sql`

## Related Knowledge

- `belongs-to` → `project.prisma`
- `writes` → `data.model.patientintakedocument`
