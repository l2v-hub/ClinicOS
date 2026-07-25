---
id: 'data.model.importdocument'
kind: 'data-model'
title: 'ImportDocument'
status: 'observed'
summary: 'Prisma persistence model ImportDocument.'
bounded_contexts:
  - 'context.clinical-record'
sources:
  - path: 'prisma/schema.prisma'
    symbol: 'ImportDocument'
    line_start: '507'
    line_end: '530'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.prisma'
    evidence: 'prisma/schema.prisma'
    confidence: 'observed'
  - type: 'depends-on'
    target: 'data.model.importjob'
    evidence: 'prisma/schema.prisma'
    confidence: 'observed'
tags:
  - 'prisma'
  - 'database-model'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `data.model.importdocument` represent in ClinicOS?

## Canonical Definition

data.model.importdocument is the canonical data-model named ImportDocument.

## Inputs

- `id: String` (id, required, default=cuid())
- `jobId: String` (required)
- `filename: String` (required)
- `mimeType: String` (required)
- `sizeBytes: Int` (required)
- `sha256: String` (required)
- `storagePath: String` (required)
- `dataBase64: String?` (nullable)
- `sortOrder: Int` (required, default=0)
- `logicalDoc: String?` (nullable)
- `status: String` (required, default="uploaded")
- `rejectReason: String?` (nullable)
- `errorCode: String?` (nullable)
- `errorMessage: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `job: ImportJob` (required)

## Outputs

Persisted PostgreSQL row for `ImportDocument`.

## Dependencies

- - `job` → `ImportJob` (required-one; onDelete=Cascade)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `jobId`: required
- `filename`: required
- `mimeType`: required
- `sizeBytes`: required
- `sha256`: required
- `storagePath`: required
- `sortOrder`: required
- `status`: required
- `createdAt`: required
- `job`: required
- index on `jobId`
- unique constraint on `jobId, sha256`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:507-530` — ImportDocument

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.importjob`
