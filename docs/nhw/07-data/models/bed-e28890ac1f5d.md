---
id: 'data.model.bed'
kind: 'data-model'
title: 'Bed'
status: 'observed'
summary: 'Prisma persistence model Bed.'
bounded_contexts:
  - 'context.facility-occupancy'
sources:
  - path: 'prisma/schema.prisma'
    symbol: 'Bed'
    line_start: '343'
    line_end: '356'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.prisma'
    evidence: 'prisma/schema.prisma'
    confidence: 'observed'
  - type: 'depends-on'
    target: 'data.model.patientroomassignment'
    evidence: 'prisma/schema.prisma'
    confidence: 'observed'
  - type: 'depends-on'
    target: 'data.model.room'
    evidence: 'prisma/schema.prisma'
    confidence: 'observed'
tags:
  - 'prisma'
  - 'database-model'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `data.model.bed` represent in ClinicOS?

## Canonical Definition

data.model.bed is the canonical data-model named Bed.

## Inputs

- `id: String` (id, required, default=cuid())
- `roomId: String` (required)
- `label: String` (required)
- `stato: String` (required, default="libero")
- `note: String` (required, default="")
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `room: Room` (required)
- `assignments: PatientRoomAssignment[]` (required, list)

## Outputs

Persisted PostgreSQL row for `Bed`.

## Dependencies

- - `room` → `Room` (required-one; onDelete=Cascade)
- - `assignments` → `PatientRoomAssignment` (many; onDelete=unspecified)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `roomId`: required
- `label`: required
- `stato`: required
- `note`: required
- `createdAt`: required
- `updatedAt`: required
- `room`: required
- `assignments`: required
- index on `roomId`
- unique constraint on `roomId, label`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:343-356` — Bed

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.patientroomassignment`
- `depends-on` → `data.model.room`
