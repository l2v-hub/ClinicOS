---
id: 'data.model.importjob'
kind: 'data-model'
title: 'ImportJob'
status: 'observed'
summary: 'Prisma persistence model ImportJob.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'prisma/schema.prisma'
    symbol: 'ImportJob'
    line_start: '457'
    line_end: '491'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.prisma'
    evidence: 'prisma/schema.prisma'
    confidence: 'observed'
  - type: 'depends-on'
    target: 'data.model.importaudit'
    evidence: 'prisma/schema.prisma'
    confidence: 'observed'
  - type: 'depends-on'
    target: 'data.model.importdocument'
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

What does `data.model.importjob` represent in ClinicOS?

## Canonical Definition

data.model.importjob is the canonical data-model named ImportJob.

## Inputs

- `id: String` (id, required, default=cuid())
- `status: String` (required, default="uploaded")
- `stage: String?` (nullable)
- `currentFileName: String?` (nullable)
- `errorCode: String?` (nullable)
- `attempts: Int` (required, default=0)
- `startedAt: DateTime?` (nullable)
- `idempotencyKey: String?` (unique, nullable)
- `maxFiles: Int` (required)
- `maxTotalBytes: Int` (required)
- `totalBytes: Int` (required, default=0)
- `error: String?` (nullable)
- `resultData: Json?` (nullable)
- `model: String?` (nullable)
- `schemaVersion: String?` (nullable)
- `promptVersion: String?` (nullable)
- `createdById: String?` (nullable)
- `createdPatientId: String?` (nullable)
- `confirmedAt: DateTime?` (nullable)
- `expiresAt: DateTime` (required)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `documents: ImportDocument[]` (required, list)
- `auditEvents: ImportAudit[]` (required, list)

## Outputs

Persisted PostgreSQL row for `ImportJob`.

## Dependencies

- - `documents` → `ImportDocument` (many; onDelete=unspecified)
- - `auditEvents` → `ImportAudit` (many; onDelete=unspecified)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `status`: required
- `attempts`: required
- `idempotencyKey`: unique; nullable
- `maxFiles`: required
- `maxTotalBytes`: required
- `totalBytes`: required
- `expiresAt`: required
- `createdAt`: required
- `updatedAt`: required
- `documents`: required
- `auditEvents`: required
- index on `status`
- index on `expiresAt`
- index on `createdPatientId`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:457-491` — ImportJob

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.importaudit`
- `depends-on` → `data.model.importdocument`
