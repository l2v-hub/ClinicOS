---
id: 'data.migration.20260510120000-add-medication-administration'
kind: 'database-migration'
title: '20260510120000_add_medication_administration'
status: 'observed'
summary: 'Ordered SQL migration 20260510120000_add_medication_administration.'
bounded_contexts: []
sources:
  - path: 'prisma/migrations/20260510120000_add_medication_administration/migration.sql'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.prisma'
    evidence: 'prisma/migrations/20260510120000_add_medication_administration/migration.sql'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.medicationadministration'
    evidence: 'prisma/migrations/20260510120000_add_medication_administration/migration.sql'
    confidence: 'observed'
tags:
  - 'migration'
  - 'non-destructive'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `data.migration.20260510120000-add-medication-administration` represent in ClinicOS?

## Canonical Definition

data.migration.20260510120000-add-medication-administration is the canonical database-migration named 20260510120000_add_medication_administration.

## Inputs

Migration order: `20260510120000_add_medication_administration`.

## Outputs

- 1. `create-table` on `MedicationAdministration`
- 2. `create-unique-index` on `MedicationAdministration_patientId_farmacoNome_date_fascia_key`
- 3. `create-index` on `MedicationAdministration_date_fascia_idx`
- 4. `create-index` on `MedicationAdministration_patientId_idx`
- 5. `add-constraint` on `MedicationAdministration`

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

- `prisma/migrations/20260510120000_add_medication_administration/migration.sql`

## Related Knowledge

- `belongs-to` → `project.prisma`
- `writes` → `data.model.medicationadministration`
