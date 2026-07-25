---
id: "data.model.medicationadministration"
kind: "data-model"
title: "MedicationAdministration"
status: "observed"
summary: "Prisma persistence model MedicationAdministration."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "prisma/schema.prisma"
    symbol: "MedicationAdministration"
    line_start: "217"
    line_end: "239"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `data.model.medicationadministration` represent in ClinicOS?

## Canonical Definition

data.model.medicationadministration is the canonical data-model named MedicationAdministration.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `farmacoNome: String` (required)
- `farmacoDose: String` (required)
- `farmacoVia: String` (required, default="orale")
- `date: String` (required)
- `fascia: String` (required)
- `ora: String` (required)
- `stato: String` (required, default="da_erogare")
- `operatoreId: String?` (nullable)
- `operatoreNome: String?` (nullable)
- `confirmedAt: DateTime?` (nullable)
- `motivo: String?` (nullable)
- `note: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)

## Outputs

Persisted PostgreSQL row for `MedicationAdministration`.

## Dependencies

- - `patient` → `Patient` (required-one; onDelete=Cascade)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `patientId`: required
- `farmacoNome`: required
- `farmacoDose`: required
- `farmacoVia`: required
- `date`: required
- `fascia`: required
- `ora`: required
- `stato`: required
- `createdAt`: required
- `updatedAt`: required
- `patient`: required
- index on `date, fascia`
- index on `patientId`
- unique constraint on `patientId, farmacoNome, date, fascia`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:217-239` — MedicationAdministration

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.patient`
