---
id: "data.model.patienttherapy"
kind: "data-model"
title: "PatientTherapy"
status: "observed"
summary: "Prisma persistence model PatientTherapy."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "PatientTherapy"
    line_start: "259"
    line_end: "297"
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
  - type: "depends-on"
    target: "data.model.therapyschedule"
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

What does `data.model.patienttherapy` represent in ClinicOS?

## Canonical Definition

data.model.patienttherapy is the canonical data-model named PatientTherapy.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `farmacoNome: String` (required)
- `dosaggio: String` (required)
- `viaSomministrazione: String` (required, default="orale")
- `tipo: String` (required, default="periodica")
- `stato: String` (required, default="attiva")
- `dataInizio: String` (required)
- `dataFine: String?` (nullable)
- `fasceMattina: Boolean` (required, default=false)
- `fascePranzo: Boolean` (required, default=false)
- `fascePomeriggio: Boolean` (required, default=false)
- `fasceSera: Boolean` (required, default=false)
- `fasceNotte: Boolean` (required, default=false)
- `orarioSpecifico: String?` (nullable)
- `prescrittore: String?` (nullable)
- `operatoreInseritore: String?` (nullable)
- `note: String?` (nullable)
- `dataSomministrazione: String?` (nullable)
- `orarioSomministrazione: String?` (nullable)
- `commercialStrengthValue: Float?` (nullable)
- `commercialStrengthUnit: String?` (nullable)
- `pharmaceuticalForm: String?` (nullable)
- `allowedFractions: String?` (nullable)
- `drugPackageRef: String?` (nullable)
- `giorniSettimana: String?` (nullable)
- `schedules: TherapySchedule[]` (required, list)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)

## Outputs

Persisted PostgreSQL row for `PatientTherapy`.

## Dependencies

- - `schedules` → `TherapySchedule` (many; onDelete=unspecified)
- - `patient` → `Patient` (required-one; onDelete=Cascade)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `patientId`: required
- `farmacoNome`: required
- `dosaggio`: required
- `viaSomministrazione`: required
- `tipo`: required
- `stato`: required
- `dataInizio`: required
- `fasceMattina`: required
- `fascePranzo`: required
- `fascePomeriggio`: required
- `fasceSera`: required
- `fasceNotte`: required
- `schedules`: required
- `createdAt`: required
- `updatedAt`: required
- `patient`: required
- index on `patientId`
- index on `tipo, stato`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:259-297` — PatientTherapy

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.patient`
- `depends-on` → `data.model.therapyschedule`
