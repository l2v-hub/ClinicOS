---
id: "entity.bed"
kind: "domain-entity"
title: "Bed"
status: "inferred"
summary: "Business entity persisted by the Bed Prisma model."
bounded_contexts:
  - "context.facility-occupancy"
sources:
  - path: "prisma/schema.prisma"
    symbol: "Bed"
    line_start: "343"
    line_end: "356"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.facility-occupancy"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.bed"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "bed"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.bed` represent in ClinicOS?

## Canonical Definition

entity.bed is the canonical domain-entity named Bed.

## Inputs

- `id: String` (id, required, default=cuid())
- `roomId: String` (required)
- `label: String` (required)
- `stato: String` (required, default="libero")
- `note: String` (required, default="")
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `room: Room` (required)
- `assignments: PatientRoomAssignment[]` (required, list)

## Outputs

Lifecycle state persisted as `data.model.bed`.

## Dependencies

- - `room` → `Room` (required-one; onDelete=Cascade)
- - `assignments` → `PatientRoomAssignment` (many; onDelete=unspecified)

## Side Effects

Creation, mutation, and deletion alter persistent clinical state.

## Consumers

Endpoint and UI consumers are navigable through graph relations to the persistence model.

## Invariants

Identity, nullability, uniqueness, defaults, and relations are authoritative in `prisma/schema.prisma`.

## Failure Modes

Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.

## Evidence

- `prisma/schema.prisma:343-356` — Bed

## Related Knowledge

- `belongs-to` → `context.facility-occupancy`
- `persists-as` → `data.model.bed`
