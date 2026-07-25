---
id: "entity.operator"
kind: "domain-entity"
title: "Operator"
status: "inferred"
summary: "Business entity persisted by the Operator Prisma model."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "prisma/schema.prisma"
    symbol: "Operator"
    line_start: "38"
    line_end: "54"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.identity-access"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.operator"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "operator"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.operator` represent in ClinicOS?

## Canonical Definition

entity.operator is the canonical domain-entity named Operator.

## Inputs

- `id: String` (id, required, default=cuid())
- `userId: String` (unique, required)
- `licenseNumber: String?` (unique, nullable)
- `department: String?` (nullable)
- `phone: String?` (nullable)
- `ruolo: String?` (nullable)
- `qualifica: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `user: User` (required)
- `registeredPatients: Patient[]` (required, list)
- `appointments: Appointment[]` (required, list)
- `clinicalRecords: ClinicalRecord[]` (required, list)
- `clinicalNotes: ClinicalNote[]` (required, list)
- `schedule: OperatorSchedule?` (nullable)

## Outputs

Lifecycle state persisted as `data.model.operator`.

## Dependencies

- - `user` → `User` (required-one; onDelete=Cascade)
- - `registeredPatients` → `Patient` (many; onDelete=unspecified)
- - `appointments` → `Appointment` (many; onDelete=unspecified)
- - `clinicalRecords` → `ClinicalRecord` (many; onDelete=unspecified)
- - `clinicalNotes` → `ClinicalNote` (many; onDelete=unspecified)
- - `schedule` → `OperatorSchedule` (optional-one; onDelete=unspecified)

## Side Effects

Creation, mutation, and deletion alter persistent clinical state.

## Consumers

Endpoint and UI consumers are navigable through graph relations to the persistence model.

## Invariants

Identity, nullability, uniqueness, defaults, and relations are authoritative in `prisma/schema.prisma`.

## Failure Modes

Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.

## Evidence

- `prisma/schema.prisma:38-54` — Operator

## Related Knowledge

- `belongs-to` → `context.identity-access`
- `persists-as` → `data.model.operator`
