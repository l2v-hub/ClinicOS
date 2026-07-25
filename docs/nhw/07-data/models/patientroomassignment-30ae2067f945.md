---
id: "data.model.patientroomassignment"
kind: "data-model"
title: "PatientRoomAssignment"
status: "observed"
summary: "Prisma persistence model PatientRoomAssignment."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "PatientRoomAssignment"
    line_start: "358"
    line_end: "375"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.bed"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `data.model.patientroomassignment` represent in ClinicOS?

## Canonical Definition

data.model.patientroomassignment is the canonical data-model named PatientRoomAssignment.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `roomId: String` (required)
- `bedId: String` (required)
- `startDate: String` (required)
- `endDate: String?` (nullable)
- `note: String` (required, default="")
- `createdById: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)
- `bed: Bed` (required)

## Outputs

Persisted PostgreSQL row for `PatientRoomAssignment`.

## Dependencies

- - `patient` → `Patient` (required-one; onDelete=Cascade)
- - `bed` → `Bed` (required-one; onDelete=Cascade)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `patientId`: required
- `roomId`: required
- `bedId`: required
- `startDate`: required
- `note`: required
- `createdAt`: required
- `updatedAt`: required
- `patient`: required
- `bed`: required
- index on `patientId`
- index on `bedId`
- index on `startDate, endDate`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:358-375` — PatientRoomAssignment

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.bed`
- `depends-on` → `data.model.patient`
