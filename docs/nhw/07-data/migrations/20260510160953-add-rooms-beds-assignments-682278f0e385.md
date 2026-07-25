---
id: "data.migration.20260510160953-add-rooms-beds-assignments"
kind: "database-migration"
title: "20260510160953_add_rooms_beds_assignments"
status: "observed"
summary: "Ordered SQL migration 20260510160953_add_rooms_beds_assignments."
bounded_contexts: []
sources:
  - path: "prisma/migrations/20260510160953_add_rooms_beds_assignments/migration.sql"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/migrations/20260510160953_add_rooms_beds_assignments/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.bed"
    evidence: "prisma/migrations/20260510160953_add_rooms_beds_assignments/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.patientroomassignment"
    evidence: "prisma/migrations/20260510160953_add_rooms_beds_assignments/migration.sql"
    confidence: "observed"
  - type: "writes"
    target: "data.model.room"
    evidence: "prisma/migrations/20260510160953_add_rooms_beds_assignments/migration.sql"
    confidence: "observed"
tags:
  - "migration"
  - "non-destructive"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `data.migration.20260510160953-add-rooms-beds-assignments` represent in ClinicOS?

## Canonical Definition

data.migration.20260510160953-add-rooms-beds-assignments is the canonical database-migration named 20260510160953_add_rooms_beds_assignments.

## Inputs

Migration order: `20260510160953_add_rooms_beds_assignments`.

## Outputs

- 1. `sql-statement`
- 2. `sql-statement`
- 3. `create-table` on `Room`
- 4. `create-table` on `Bed`
- 5. `create-table` on `PatientRoomAssignment`
- 6. `create-unique-index` on `Room_numero_key`
- 7. `create-index` on `Bed_roomId_idx`
- 8. `create-unique-index` on `Bed_roomId_label_key`
- 9. `create-index` on `PatientRoomAssignment_patientId_idx`
- 10. `create-index` on `PatientRoomAssignment_bedId_idx`
- 11. `create-index` on `PatientRoomAssignment_startDate_endDate_idx`
- 12. `add-constraint` on `Bed`
- 13. `add-constraint` on `PatientRoomAssignment`
- 14. `add-constraint` on `PatientRoomAssignment`

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

- `prisma/migrations/20260510160953_add_rooms_beds_assignments/migration.sql`

## Related Knowledge

- `belongs-to` → `project.prisma`
- `writes` → `data.model.bed`
- `writes` → `data.model.patientroomassignment`
- `writes` → `data.model.room`
