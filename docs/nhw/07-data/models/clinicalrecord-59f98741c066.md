---
id: "data.model.clinicalrecord"
kind: "data-model"
title: "ClinicalRecord"
status: "observed"
summary: "Prisma persistence model ClinicalRecord."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "prisma/schema.prisma"
    symbol: "ClinicalRecord"
    line_start: "159"
    line_end: "176"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.appointment"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.clinicalnote"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.operator"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.patient"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
tags:
  - "prisma"
  - "database-model"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `data.model.clinicalrecord` represent in ClinicOS?

## Canonical Definition

data.model.clinicalrecord is the canonical data-model named ClinicalRecord.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `authorOperatorId: String` (required)
- `appointmentId: String?` (unique, nullable)
- `chiefComplaint: String?` (nullable)
- `diagnosis: String?` (nullable)
- `treatmentPlan: String?` (nullable)
- `recordedAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)
- `authorOperator: Operator` (required)
- `appointment: Appointment?` (nullable)
- `notes: ClinicalNote[]` (required, list)

## Outputs

Persisted PostgreSQL row for `ClinicalRecord`.

## Dependencies

- - `patient` → `Patient` (required-one; onDelete=Cascade)
- - `authorOperator` → `Operator` (required-one; onDelete=Restrict)
- - `appointment` → `Appointment` (optional-one; onDelete=SetNull)
- - `notes` → `ClinicalNote` (many; onDelete=unspecified)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `patientId`: required
- `authorOperatorId`: required
- `appointmentId`: unique; nullable
- `recordedAt`: required
- `updatedAt`: required
- `patient`: required
- `authorOperator`: required
- `notes`: required
- index on `patientId`
- index on `authorOperatorId`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:159-176` — ClinicalRecord

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.appointment`
- `depends-on` → `data.model.clinicalnote`
- `depends-on` → `data.model.operator`
- `depends-on` → `data.model.patient`
