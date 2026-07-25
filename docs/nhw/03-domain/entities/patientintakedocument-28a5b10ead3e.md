---
id: "entity.patientintakedocument"
kind: "domain-entity"
title: "PatientIntakeDocument"
status: "inferred"
summary: "Business entity persisted by the PatientIntakeDocument Prisma model."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "PatientIntakeDocument"
    line_start: "241"
    line_end: "257"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.patient-registry"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.patientintakedocument"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "patientintakedocument"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.patientintakedocument` represent in ClinicOS?

## Canonical Definition

entity.patientintakedocument is the canonical domain-entity named PatientIntakeDocument.

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

Lifecycle state persisted as `data.model.patientintakedocument`.

## Dependencies

- - `patient` → `Patient` (optional-one; onDelete=SetNull)

## Side Effects

Creation, mutation, and deletion alter persistent clinical state.

## Consumers

Endpoint and UI consumers are navigable through graph relations to the persistence model.

## Invariants

Identity, nullability, uniqueness, defaults, and relations are authoritative in `prisma/schema.prisma`.

## Failure Modes

Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.

## Evidence

- `prisma/schema.prisma:241-257` — PatientIntakeDocument

## Related Knowledge

- `belongs-to` → `context.patient-registry`
- `persists-as` → `data.model.patientintakedocument`
