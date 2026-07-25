---
id: "data.model.appointment"
kind: "data-model"
title: "Appointment"
status: "observed"
summary: "Prisma persistence model Appointment."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "prisma/schema.prisma"
    symbol: "Appointment"
    line_start: "192"
    line_end: "215"
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
  - type: "depends-on"
    target: "data.model.patient"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.user"
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

What does `data.model.appointment` represent in ClinicOS?

## Canonical Definition

data.model.appointment is the canonical data-model named Appointment.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `operatorId: String` (required)
- `createdByUserId: String` (required)
- `scheduledAt: DateTime` (required)
- `durationMinutes: Int` (required, default=30)
- `reason: String?` (nullable)
- `notes: String?` (nullable)
- `status: AppointmentStatus` (required, default=SCHEDULED)
- `completedAt: DateTime?` (nullable)
- `cancelledAt: DateTime?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)
- `operator: Operator` (required)
- `createdBy: User` (required)
- `clinicalRecord: ClinicalRecord?` (nullable)

## Outputs

Persisted PostgreSQL row for `Appointment`.

## Dependencies

- - `patient` → `Patient` (required-one; onDelete=Cascade)
- - `operator` → `Operator` (required-one; onDelete=Restrict)
- - `createdBy` → `User` (required-one; onDelete=Restrict)
- - `clinicalRecord` → `ClinicalRecord` (optional-one; onDelete=unspecified)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `patientId`: required
- `operatorId`: required
- `createdByUserId`: required
- `scheduledAt`: required
- `durationMinutes`: required
- `status`: required
- `createdAt`: required
- `updatedAt`: required
- `patient`: required
- `operator`: required
- `createdBy`: required
- index on `patientId, scheduledAt`
- index on `operatorId, scheduledAt`
- index on `createdByUserId`
- index on `status, scheduledAt`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:192-215` — Appointment

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.clinicalrecord`
- `depends-on` → `data.model.operator`
- `depends-on` → `data.model.patient`
- `depends-on` → `data.model.user`
