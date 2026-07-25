---
id: "entity.patientdocument"
kind: "domain-entity"
title: "PatientDocument"
status: "inferred"
summary: "Business entity persisted by the PatientDocument Prisma model."
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
    target: "context.patient-registry"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.patientdocument"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "patientdocument"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.patientdocument` represent in ClinicOS?

## Canonical Definition

entity.patientdocument is the canonical domain-entity named PatientDocument.

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

Lifecycle state persisted as `data.model.patientdocument`.

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

- `prisma/schema.prisma:132-148` — PatientDocument

## Related Knowledge

- `belongs-to` → `context.patient-registry`
- `persists-as` → `data.model.patientdocument`
