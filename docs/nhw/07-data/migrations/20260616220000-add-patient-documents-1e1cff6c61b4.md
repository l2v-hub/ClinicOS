---
id: "data.migration.20260616220000-add-patient-documents"
kind: "database-migration"
title: "20260616220000_add_patient_documents"
status: "observed"
summary: "Ordered SQL migration 20260616220000_add_patient_documents."
bounded_contexts: []
sources:
  - path: "prisma/migrations/20260616220000_add_patient_documents/migration.sql"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/migrations/20260616220000_add_patient_documents/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.patientdocument"
    evidence: "prisma/migrations/20260616220000_add_patient_documents/migration.sql"
    confidence: "observed"
tags:
  - "migration"
  - "non-destructive"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `data.migration.20260616220000-add-patient-documents` represent in ClinicOS?

## Canonical Definition

data.migration.20260616220000-add-patient-documents is the canonical database-migration named 20260616220000_add_patient_documents.

## Inputs

Migration order: `20260616220000_add_patient_documents`.

## Outputs

- 1. `create-table` on `PatientDocument`
- 2. `create-index` on `PatientDocument_patientId_idx`
- 3. `add-constraint` on `PatientDocument`

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

- `prisma/migrations/20260616220000_add_patient_documents/migration.sql`

## Related Knowledge

- `belongs-to` → `project.prisma`
- `writes` → `data.model.patientdocument`
