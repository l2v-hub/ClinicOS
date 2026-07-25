---
id: "entity.appointment"
kind: "domain-entity"
title: "Appointment"
status: "inferred"
summary: "Business entity persisted by the Appointment Prisma model."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "prisma/schema.prisma"
    symbol: "Appointment"
    line_start: "192"
    line_end: "215"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.scheduling"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.appointment"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "appointment"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.appointment` represent in ClinicOS?

## Canonical Definition

entity.appointment is the canonical domain-entity named Appointment.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `operatorId: String` (required)
- `createdByUserId: String` (required)
- `scheduledAt: DateTime` (required)
- `durationMinutes: Int` (required, default=30)
- `reason: String?` (nullable)
- `notes: String?` (nullable)
- `status: AppointmentStatus` (required, default=SCHEDULED)
- `completedAt: DateTime?` (nullable)
- `cancelledAt: DateTime?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)
- `operator: Operator` (required)
- `createdBy: User` (required)
- `clinicalRecord: ClinicalRecord?` (nullable)

## Outputs

Lifecycle state persisted as `data.model.appointment`.

## Dependencies

- - `patient` → `Patient` (required-one; onDelete=Cascade)
- - `operator` → `Operator` (required-one; onDelete=Restrict)
- - `createdBy` → `User` (required-one; onDelete=Restrict)
- - `clinicalRecord` → `ClinicalRecord` (optional-one; onDelete=unspecified)

## Side Effects

Creation, mutation, and deletion alter persistent clinical state.

## Consumers

Endpoint and UI consumers are navigable through graph relations to the persistence model.

## Invariants

Identity, nullability, uniqueness, defaults, and relations are authoritative in `prisma/schema.prisma`.

## Failure Modes

Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.

## Evidence

- `prisma/schema.prisma:192-215` — Appointment

## Related Knowledge

- `belongs-to` → `context.scheduling`
- `persists-as` → `data.model.appointment`
