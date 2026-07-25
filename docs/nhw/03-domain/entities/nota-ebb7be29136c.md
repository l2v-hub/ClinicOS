---
id: "entity.nota"
kind: "domain-entity"
title: "Nota"
status: "inferred"
summary: "Business entity persisted by the Nota Prisma model."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "prisma/schema.prisma"
    symbol: "Nota"
    line_start: "396"
    line_end: "412"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.operator-collaboration"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.nota"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "nota"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.nota` represent in ClinicOS?

## Canonical Definition

entity.nota is the canonical domain-entity named Nota.

## Inputs

- `id: String` (id, required, default=cuid())
- `autoreId: String` (required)
- `autoreNome: String` (required)
- `destinatarioId: String` (required)
- `destinatarioNome: String` (required)
- `pazienteId: String?` (nullable)
- `pazienteNome: String?` (nullable)
- `priorita: String` (required, default="normale")
- `messaggio: String` (required)
- `stato: String` (required, default="non_letta")
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)

## Outputs

Lifecycle state persisted as `data.model.nota`.

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

- `prisma/schema.prisma:396-412` — Nota

## Related Knowledge

- `belongs-to` → `context.operator-collaboration`
- `persists-as` → `data.model.nota`
