---
id: "data.model.patientintakedraft"
kind: "data-model"
title: "PatientIntakeDraft"
status: "observed"
summary: "Prisma persistence model PatientIntakeDraft."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "PatientIntakeDraft"
    line_start: "437"
    line_end: "451"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
tags:
  - "prisma"
  - "database-model"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `data.model.patientintakedraft` represent in ClinicOS?

## Canonical Definition

data.model.patientintakedraft is the canonical data-model named PatientIntakeDraft.

## Inputs

- `id: String` (id, required, default=cuid())
- `status: String` (required, default="draft")
- `source: String` (required, default="manual")
- `data: Json` (required, default="{}")
- `importJobId: String?` (unique, nullable)
- `createdById: String?` (nullable)
- `confirmedPatientId: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `confirmedAt: DateTime?` (nullable)

## Outputs

Persisted PostgreSQL row for `PatientIntakeDraft`.

## Dependencies

None observed

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `status`: required
- `source`: required
- `data`: required
- `importJobId`: unique; nullable
- `createdAt`: required
- `updatedAt`: required
- index on `status`
- index on `createdById`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:437-451` — PatientIntakeDraft

## Related Knowledge

- `belongs-to` → `project.prisma`
