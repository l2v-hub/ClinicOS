---
id: "data.model.importaudit"
kind: "data-model"
title: "ImportAudit"
status: "observed"
summary: "Prisma persistence model ImportAudit."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "prisma/schema.prisma"
    symbol: "ImportAudit"
    line_start: "494"
    line_end: "505"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.importjob"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
tags:
  - "prisma"
  - "database-model"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `data.model.importaudit` represent in ClinicOS?

## Canonical Definition

data.model.importaudit is the canonical data-model named ImportAudit.

## Inputs

- `id: String` (id, required, default=cuid())
- `jobId: String` (required)
- `patientId: String?` (nullable)
- `action: String` (required)
- `detail: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `job: ImportJob` (required)

## Outputs

Persisted PostgreSQL row for `ImportAudit`.

## Dependencies

- - `job` → `ImportJob` (required-one; onDelete=Cascade)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `jobId`: required
- `action`: required
- `createdAt`: required
- `job`: required
- index on `jobId`
- index on `patientId`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:494-505` — ImportAudit

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.importjob`
