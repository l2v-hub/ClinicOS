---
id: "data.model.patientdiaryentry"
kind: "data-model"
title: "PatientDiaryEntry"
status: "observed"
summary: "Prisma persistence model PatientDiaryEntry."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "PatientDiaryEntry"
    line_start: "414"
    line_end: "432"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
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
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `data.model.patientdiaryentry` represent in ClinicOS?

## Canonical Definition

data.model.patientdiaryentry is the canonical data-model named PatientDiaryEntry.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `authorType: String` (required)
- `authorName: String` (required)
- `title: String?` (nullable)
- `content: String` (required)
- `priority: String` (required, default="normale")
- `status: String` (required, default="aperta")
- `entryDateTime: String` (required)
- `category: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)

## Outputs

Persisted PostgreSQL row for `PatientDiaryEntry`.

## Dependencies

- - `patient` → `Patient` (required-one; onDelete=Cascade)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `patientId`: required
- `authorType`: required
- `authorName`: required
- `content`: required
- `priority`: required
- `status`: required
- `entryDateTime`: required
- `createdAt`: required
- `updatedAt`: required
- `patient`: required
- index on `patientId`
- index on `authorType`
- index on `entryDateTime`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:414-432` — PatientDiaryEntry

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.patient`
