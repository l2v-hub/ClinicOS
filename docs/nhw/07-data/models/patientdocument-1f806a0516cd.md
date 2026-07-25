---
id: "data.model.patientdocument"
kind: "data-model"
title: "PatientDocument"
status: "observed"
summary: "Prisma persistence model PatientDocument."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "PatientDocument"
    line_start: "132"
    line_end: "148"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `data.model.patientdocument` represent in ClinicOS?

## Canonical Definition

data.model.patientdocument is the canonical data-model named PatientDocument.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `importJobId: String?` (nullable)
- `originalName: String` (required)
- `mimeType: String` (required)
- `sizeBytes: Int` (required)
- `sha256: String` (required)
- `dataBase64: String` (required)
- `documentType: String` (required, default="discharge_import")
- `sortOrder: Int` (required, default=0)
- `createdById: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `patient: Patient` (required)

## Outputs

Persisted PostgreSQL row for `PatientDocument`.

## Dependencies

- - `patient` → `Patient` (required-one; onDelete=Cascade)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `patientId`: required
- `originalName`: required
- `mimeType`: required
- `sizeBytes`: required
- `sha256`: required
- `dataBase64`: required
- `documentType`: required
- `sortOrder`: required
- `createdAt`: required
- `patient`: required
- index on `patientId`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:132-148` — PatientDocument

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.patient`
