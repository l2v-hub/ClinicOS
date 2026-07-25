---
id: "data.model.clinicalnote"
kind: "data-model"
title: "ClinicalNote"
status: "observed"
summary: "Prisma persistence model ClinicalNote."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "prisma/schema.prisma"
    symbol: "ClinicalNote"
    line_start: "178"
    line_end: "190"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.clinicalrecord"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.operator"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
tags:
  - "prisma"
  - "database-model"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `data.model.clinicalnote` represent in ClinicOS?

## Canonical Definition

data.model.clinicalnote is the canonical data-model named ClinicalNote.

## Inputs

- `id: String` (id, required, default=cuid())
- `clinicalRecordId: String` (required)
- `authorOperatorId: String` (required)
- `note: String` (required)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `clinicalRecord: ClinicalRecord` (required)
- `authorOperator: Operator` (required)

## Outputs

Persisted PostgreSQL row for `ClinicalNote`.

## Dependencies

- - `clinicalRecord` → `ClinicalRecord` (required-one; onDelete=Cascade)
- - `authorOperator` → `Operator` (required-one; onDelete=Restrict)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `clinicalRecordId`: required
- `authorOperatorId`: required
- `note`: required
- `createdAt`: required
- `updatedAt`: required
- `clinicalRecord`: required
- `authorOperator`: required
- index on `clinicalRecordId`
- index on `authorOperatorId`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:178-190` — ClinicalNote

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.clinicalrecord`
- `depends-on` → `data.model.operator`
