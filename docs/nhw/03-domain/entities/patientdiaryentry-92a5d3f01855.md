---
id: "entity.patientdiaryentry"
kind: "domain-entity"
title: "PatientDiaryEntry"
status: "inferred"
summary: "Business entity persisted by the PatientDiaryEntry Prisma model."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "PatientDiaryEntry"
    line_start: "414"
    line_end: "432"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.patient-registry"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.patientdiaryentry"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "patientdiaryentry"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.patientdiaryentry` represent in ClinicOS?

## Canonical Definition

entity.patientdiaryentry is the canonical domain-entity named PatientDiaryEntry.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `authorType: String` (required)
- `authorName: String` (required)
- `title: String?` (nullable)
- `content: String` (required)
- `priority: String` (required, default="normale")
- `status: String` (required, default="aperta")
- `entryDateTime: String` (required)
- `category: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)

## Outputs

Lifecycle state persisted as `data.model.patientdiaryentry`.

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

- `prisma/schema.prisma:414-432` — PatientDiaryEntry

## Related Knowledge

- `belongs-to` → `context.patient-registry`
- `persists-as` → `data.model.patientdiaryentry`
