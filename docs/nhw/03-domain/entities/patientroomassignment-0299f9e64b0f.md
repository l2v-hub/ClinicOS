---
id: "entity.patientroomassignment"
kind: "domain-entity"
title: "PatientRoomAssignment"
status: "inferred"
summary: "Business entity persisted by the PatientRoomAssignment Prisma model."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "PatientRoomAssignment"
    line_start: "358"
    line_end: "375"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.patient-registry"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.patientroomassignment"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "patientroomassignment"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.patientroomassignment` represent in ClinicOS?

## Canonical Definition

entity.patientroomassignment is the canonical domain-entity named PatientRoomAssignment.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `roomId: String` (required)
- `bedId: String` (required)
- `startDate: String` (required)
- `endDate: String?` (nullable)
- `note: String` (required, default="")
- `createdById: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)
- `bed: Bed` (required)

## Outputs

Lifecycle state persisted as `data.model.patientroomassignment`.

## Dependencies

- - `patient` → `Patient` (required-one; onDelete=Cascade)
- - `bed` → `Bed` (required-one; onDelete=Cascade)

## Side Effects

Creation, mutation, and deletion alter persistent clinical state.

## Consumers

Endpoint and UI consumers are navigable through graph relations to the persistence model.

## Invariants

Identity, nullability, uniqueness, defaults, and relations are authoritative in `prisma/schema.prisma`.

## Failure Modes

Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.

## Evidence

- `prisma/schema.prisma:358-375` — PatientRoomAssignment

## Related Knowledge

- `belongs-to` → `context.patient-registry`
- `persists-as` → `data.model.patientroomassignment`
