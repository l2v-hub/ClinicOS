---
id: "entity.patienttherapy"
kind: "domain-entity"
title: "PatientTherapy"
status: "inferred"
summary: "Business entity persisted by the PatientTherapy Prisma model."
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
    target: "context.patient-registry"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.patienttherapy"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "patienttherapy"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.patienttherapy` represent in ClinicOS?

## Canonical Definition

entity.patienttherapy is the canonical domain-entity named PatientTherapy.

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

Lifecycle state persisted as `data.model.patienttherapy`.

## Dependencies

- - `schedules` → `TherapySchedule` (many; onDelete=unspecified)
- - `patient` → `Patient` (required-one; onDelete=Cascade)

## Side Effects

Creation, mutation, and deletion alter persistent clinical state.

## Consumers

Endpoint and UI consumers are navigable through graph relations to the persistence model.

## Invariants

Identity, nullability, uniqueness, defaults, and relations are authoritative in `prisma/schema.prisma`.

## Failure Modes

Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.

## Evidence

- `prisma/schema.prisma:259-297` — PatientTherapy

## Related Knowledge

- `belongs-to` → `context.patient-registry`
- `persists-as` → `data.model.patienttherapy`
