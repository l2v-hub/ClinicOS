---
id: 'data.model.patientintakedocument'
kind: 'data-model'
title: 'PatientIntakeDocument'
status: 'observed'
summary: 'Prisma persistence model PatientIntakeDocument.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'prisma/schema.prisma'
    symbol: 'PatientIntakeDocument'
    line_start: '241'
    line_end: '257'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.prisma'
    evidence: 'prisma/schema.prisma'
    confidence: 'observed'
  - type: 'depends-on'
    target: 'data.model.patient'
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

What does `data.model.patientintakedocument` represent in ClinicOS?

## Canonical Definition

data.model.patientintakedocument is the canonical data-model named PatientIntakeDocument.

## Inputs

- `id: String` (id, required, default=cuid())
- `fileName: String` (required)
- `fileType: String` (required)
- `fileData: String` (required)
- `ocrText: String?` (nullable)
- `extractedData: Json?` (nullable)
- `status: String` (required, default="uploaded")
- `patientId: String?` (nullable)
- `operatoreNome: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient?` (nullable)

## Outputs

Persisted PostgreSQL row for `PatientIntakeDocument`.

## Dependencies

- - `patient` → `Patient` (optional-one; onDelete=SetNull)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `fileName`: required
- `fileType`: required
- `fileData`: required
- `status`: required
- `createdAt`: required
- `updatedAt`: required
- index on `patientId`
- index on `status`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:241-257` — PatientIntakeDocument

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.patient`
