---
id: "entity.cartella"
kind: "domain-entity"
title: "Cartella"
status: "inferred"
summary: "Business entity persisted by the Cartella Prisma model."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "prisma/schema.prisma"
    symbol: "Cartella"
    line_start: "150"
    line_end: "157"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.clinical-record"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.cartella"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "cartella"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.cartella` represent in ClinicOS?

## Canonical Definition

entity.cartella is the canonical domain-entity named Cartella.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (unique, required)
- `data: Json` (required)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)

## Outputs

Lifecycle state persisted as `data.model.cartella`.

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

- `prisma/schema.prisma:150-157` — Cartella

## Related Knowledge

- `belongs-to` → `context.clinical-record`
- `persists-as` → `data.model.cartella`
