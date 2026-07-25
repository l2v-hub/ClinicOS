---
id: "data.model.patient"
kind: "data-model"
title: "Patient"
status: "observed"
summary: "Prisma persistence model Patient."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "Patient"
    line_start: "67"
    line_end: "99"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.prisma"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.appointment"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.cartella"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.clinicalrecord"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.medicationadministration"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.operator"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.patientdiaryentry"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.patientdocument"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.patientintakedocument"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.patientnarrativesection"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.patientroomassignment"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
  - type: "depends-on"
    target: "data.model.patienttherapy"
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

What does `data.model.patient` represent in ClinicOS?

## Canonical Definition

data.model.patient is the canonical data-model named Patient.

## Inputs

- `id: String` (id, required, default=cuid())
- `medicalRecordNumber: String` (unique, required)
- `firstName: String` (required)
- `lastName: String` (required)
- `dateOfBirth: DateTime` (required)
- `sex: String?` (nullable)
- `codiceFiscale: String?` (unique, nullable)
- `email: String?` (nullable)
- `phone: String?` (nullable)
- `address: String?` (nullable)
- `emergencyContactName: String?` (nullable)
- `emergencyContactPhone: String?` (nullable)
- `registeredById: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `registeredBy: Operator?` (nullable)
- `clinicalRecords: ClinicalRecord[]` (required, list)
- `appointments: Appointment[]` (required, list)
- `cartella: Cartella?` (nullable)
- `medicationAdministrations: MedicationAdministration[]` (required, list)
- `intakeDocuments: PatientIntakeDocument[]` (required, list)
- `therapies: PatientTherapy[]` (required, list)
- `roomAssignments: PatientRoomAssignment[]` (required, list)
- `diaryEntries: PatientDiaryEntry[]` (required, list)
- `narrativeSections: PatientNarrativeSection[]` (required, list)
- `documents: PatientDocument[]` (required, list)

## Outputs

Persisted PostgreSQL row for `Patient`.

## Dependencies

- - `registeredBy` → `Operator` (optional-one; onDelete=SetNull)
- - `clinicalRecords` → `ClinicalRecord` (many; onDelete=unspecified)
- - `appointments` → `Appointment` (many; onDelete=unspecified)
- - `cartella` → `Cartella` (optional-one; onDelete=unspecified)
- - `medicationAdministrations` → `MedicationAdministration` (many; onDelete=unspecified)
- - `intakeDocuments` → `PatientIntakeDocument` (many; onDelete=unspecified)
- - `therapies` → `PatientTherapy` (many; onDelete=unspecified)
- - `roomAssignments` → `PatientRoomAssignment` (many; onDelete=unspecified)
- - `diaryEntries` → `PatientDiaryEntry` (many; onDelete=unspecified)
- - `narrativeSections` → `PatientNarrativeSection` (many; onDelete=unspecified)
- - `documents` → `PatientDocument` (many; onDelete=unspecified)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `medicalRecordNumber`: unique; required
- `firstName`: required
- `lastName`: required
- `dateOfBirth`: required
- `codiceFiscale`: unique; nullable
- `createdAt`: required
- `updatedAt`: required
- `clinicalRecords`: required
- `appointments`: required
- `medicationAdministrations`: required
- `intakeDocuments`: required
- `therapies`: required
- `roomAssignments`: required
- `diaryEntries`: required
- `narrativeSections`: required
- `documents`: required
- index on `lastName, firstName`
- index on `registeredById`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:67-99` — Patient

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.appointment`
- `depends-on` → `data.model.cartella`
- `depends-on` → `data.model.clinicalrecord`
- `depends-on` → `data.model.medicationadministration`
- `depends-on` → `data.model.operator`
- `depends-on` → `data.model.patientdiaryentry`
- `depends-on` → `data.model.patientdocument`
- `depends-on` → `data.model.patientintakedocument`
- `depends-on` → `data.model.patientnarrativesection`
- `depends-on` → `data.model.patientroomassignment`
- `depends-on` → `data.model.patienttherapy`
