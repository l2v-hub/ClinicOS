---
id: "entity.clinicalnote"
kind: "domain-entity"
title: "ClinicalNote"
status: "inferred"
summary: "Business entity persisted by the ClinicalNote Prisma model."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "prisma/schema.prisma"
    symbol: "ClinicalNote"
    line_start: "178"
    line_end: "190"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.clinical-record"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.clinicalnote"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "clinicalnote"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.clinicalnote` represent in ClinicOS?

## Canonical Definition

entity.clinicalnote is the canonical domain-entity named ClinicalNote.

## Inputs

- `id: String` (id, required, default=cuid())
- `clinicalRecordId: String` (required)
- `authorOperatorId: String` (required)
- `note: String` (required)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `clinicalRecord: ClinicalRecord` (required)
- `authorOperator: Operator` (required)

## Outputs

Lifecycle state persisted as `data.model.clinicalnote`.

## Dependencies

- - `clinicalRecord` → `ClinicalRecord` (required-one; onDelete=Cascade)
- - `authorOperator` → `Operator` (required-one; onDelete=Restrict)

## Side Effects

Creation, mutation, and deletion alter persistent clinical state.

## Consumers

Endpoint and UI consumers are navigable through graph relations to the persistence model.

## Invariants

Identity, nullability, uniqueness, defaults, and relations are authoritative in `prisma/schema.prisma`.

## Failure Modes

Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.

## Evidence

- `prisma/schema.prisma:178-190` — ClinicalNote

## Related Knowledge

- `belongs-to` → `context.clinical-record`
- `persists-as` → `data.model.clinicalnote`
