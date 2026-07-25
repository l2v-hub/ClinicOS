---
id: "entity.therapyschedule"
kind: "domain-entity"
title: "TherapySchedule"
status: "inferred"
summary: "Business entity persisted by the TherapySchedule Prisma model."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "prisma/schema.prisma"
    symbol: "TherapySchedule"
    line_start: "301"
    line_end: "314"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.therapy-administration"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.therapyschedule"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "therapyschedule"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.therapyschedule` represent in ClinicOS?

## Canonical Definition

entity.therapyschedule is the canonical domain-entity named TherapySchedule.

## Inputs

- `id: String` (id, required, default=cuid())
- `therapyId: String` (required)
- `time: String` (required)
- `fascia: String` (required)
- `quantityNumerator: Int` (required, default=1)
- `quantityDenominator: Int` (required, default=1)
- `administrationUnit: String` (required, default="compressa")
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `therapy: PatientTherapy` (required)

## Outputs

Lifecycle state persisted as `data.model.therapyschedule`.

## Dependencies

- - `therapy` → `PatientTherapy` (required-one; onDelete=Cascade)

## Side Effects

Creation, mutation, and deletion alter persistent clinical state.

## Consumers

Endpoint and UI consumers are navigable through graph relations to the persistence model.

## Invariants

Identity, nullability, uniqueness, defaults, and relations are authoritative in `prisma/schema.prisma`.

## Failure Modes

Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.

## Evidence

- `prisma/schema.prisma:301-314` — TherapySchedule

## Related Knowledge

- `belongs-to` → `context.therapy-administration`
- `persists-as` → `data.model.therapyschedule`
