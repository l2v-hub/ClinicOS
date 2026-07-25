---
id: "data.migration.20260616080000-add-patient-narrative-sections"
kind: "database-migration"
title: "20260616080000_add_patient_narrative_sections"
status: "observed"
summary: "Ordered SQL migration 20260616080000_add_patient_narrative_sections."
bounded_contexts: []
sources:
  - path: "prisma/migrations/20260616080000_add_patient_narrative_sections/migration.sql"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/migrations/20260616080000_add_patient_narrative_sections/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.patientnarrativesection"
    evidence: "prisma/migrations/20260616080000_add_patient_narrative_sections/migration.sql"
    confidence: "observed"
tags:
  - "migration"
  - "non-destructive"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `data.migration.20260616080000-add-patient-narrative-sections` represent in ClinicOS?

## Canonical Definition

data.migration.20260616080000-add-patient-narrative-sections is the canonical database-migration named 20260616080000_add_patient_narrative_sections.

## Inputs

Migration order: `20260616080000_add_patient_narrative_sections`.

## Outputs

- 1. `create-table` on `PatientNarrativeSection`
- 2. `create-index` on `PatientNarrativeSection_patientId_idx`
- 3. `create-unique-index` on `PatientNarrativeSection_patientId_sectionKey_key`
- 4. `add-constraint` on `PatientNarrativeSection`

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

- `prisma/migrations/20260616080000_add_patient_narrative_sections/migration.sql`

## Related Knowledge

- `belongs-to` → `project.prisma`
- `writes` → `data.model.patientnarrativesection`
