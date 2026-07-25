---
id: "data.model.patientnarrativesection"
kind: "data-model"
title: "PatientNarrativeSection"
status: "observed"
summary: "Prisma persistence model PatientNarrativeSection."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "PatientNarrativeSection"
    line_start: "105"
    line_end: "126"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `data.model.patientnarrativesection` represent in ClinicOS?

## Canonical Definition

data.model.patientnarrativesection is the canonical data-model named PatientNarrativeSection.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `sectionKey: String` (required)
- `detectedHeading: String?` (nullable)
- `originalText: String` (required, default="")
- `reviewedText: String?` (nullable)
- `annotations: Json?` (nullable)
- `sourceReferences: Json?` (nullable)
- `importJobId: String?` (nullable)
- `reviewStatus: String` (required, default="pending")
- `createdBy: String?` (nullable)
- `updatedBy: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)

## Outputs

Persisted PostgreSQL row for `PatientNarrativeSection`.

## Dependencies

- - `patient` → `Patient` (required-one; onDelete=Cascade)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `patientId`: required
- `sectionKey`: required
- `originalText`: required
- `reviewStatus`: required
- `createdAt`: required
- `updatedAt`: required
- `patient`: required
- index on `patientId`
- unique constraint on `patientId, sectionKey`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:105-126` — PatientNarrativeSection

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.patient`
