---
id: "entity.medicationadministration"
kind: "domain-entity"
title: "MedicationAdministration"
status: "inferred"
summary: "Business entity persisted by the MedicationAdministration Prisma model."
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
    target: "context.therapy-administration"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.medicationadministration"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "medicationadministration"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.medicationadministration` represent in ClinicOS?

## Canonical Definition

entity.medicationadministration is the canonical domain-entity named MedicationAdministration.

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

Lifecycle state persisted as `data.model.medicationadministration`.

## Dependencies

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

- `prisma/schema.prisma:217-239` — MedicationAdministration

## Related Knowledge

- `belongs-to` → `context.therapy-administration`
- `persists-as` → `data.model.medicationadministration`
