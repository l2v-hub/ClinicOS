---
id: "entity.patientintakedraft"
kind: "domain-entity"
title: "PatientIntakeDraft"
status: "inferred"
summary: "Business entity persisted by the PatientIntakeDraft Prisma model."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "PatientIntakeDraft"
    line_start: "437"
    line_end: "451"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.patient-registry"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.patientintakedraft"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "patientintakedraft"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.patientintakedraft` represent in ClinicOS?

## Canonical Definition

entity.patientintakedraft is the canonical domain-entity named PatientIntakeDraft.

## Inputs

- `id: String` (id, required, default=cuid())
- `status: String` (required, default="draft")
- `source: String` (required, default="manual")
- `data: Json` (required, default="{}")
- `importJobId: String?` (unique, nullable)
- `createdById: String?` (nullable)
- `confirmedPatientId: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `confirmedAt: DateTime?` (nullable)

## Outputs

Lifecycle state persisted as `data.model.patientintakedraft`.

## Dependencies

None observed

## Side Effects

Creation, mutation, and deletion alter persistent clinical state.

## Consumers

Endpoint and UI consumers are navigable through graph relations to the persistence model.

## Invariants

Identity, nullability, uniqueness, defaults, and relations are authoritative in `prisma/schema.prisma`.

## Failure Modes

Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.

## Evidence

- `prisma/schema.prisma:437-451` — PatientIntakeDraft

## Related Knowledge

- `belongs-to` → `context.patient-registry`
- `persists-as` → `data.model.patientintakedraft`
