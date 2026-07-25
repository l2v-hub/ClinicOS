---
id: "data.model.therapyschedule"
kind: "data-model"
title: "TherapySchedule"
status: "observed"
summary: "Prisma persistence model TherapySchedule."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "prisma/schema.prisma"
    symbol: "TherapySchedule"
    line_start: "301"
    line_end: "314"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.patienttherapy"
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

What does `data.model.therapyschedule` represent in ClinicOS?

## Canonical Definition

data.model.therapyschedule is the canonical data-model named TherapySchedule.

## Inputs

- `id: String` (id, required, default=cuid())
- `therapyId: String` (required)
- `time: String` (required)
- `fascia: String` (required)
- `quantityNumerator: Int` (required, default=1)
- `quantityDenominator: Int` (required, default=1)
- `administrationUnit: String` (required, default="compressa")
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `therapy: PatientTherapy` (required)

## Outputs

Persisted PostgreSQL row for `TherapySchedule`.

## Dependencies

- - `therapy` → `PatientTherapy` (required-one; onDelete=Cascade)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `therapyId`: required
- `time`: required
- `fascia`: required
- `quantityNumerator`: required
- `quantityDenominator`: required
- `administrationUnit`: required
- `createdAt`: required
- `updatedAt`: required
- `therapy`: required
- index on `therapyId`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:301-314` — TherapySchedule

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.patienttherapy`
