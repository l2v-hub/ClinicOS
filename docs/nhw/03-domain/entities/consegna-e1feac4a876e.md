---
id: "entity.consegna"
kind: "domain-entity"
title: "Consegna"
status: "inferred"
summary: "Business entity persisted by the Consegna Prisma model."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "prisma/schema.prisma"
    symbol: "Consegna"
    line_start: "377"
    line_end: "394"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.operator-collaboration"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.consegna"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "consegna"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.consegna` represent in ClinicOS?

## Canonical Definition

entity.consegna is the canonical domain-entity named Consegna.

## Inputs

- `id: String` (id, required, default=cuid())
- `pazienteId: String` (required, default="")
- `pazienteNome: String` (required)
- `priorita: String` (required, default="normale")
- `stato: String` (required, default="aperta")
- `tipo: String` (required, default="Monitoraggio")
- `note: String` (required)
- `scadenza: String` (required)
- `oraScadenza: String?` (nullable)
- `operatoreAssegnato: String` (required)
- `creatoDA: String` (required)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)

## Outputs

Lifecycle state persisted as `data.model.consegna`.

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

- `prisma/schema.prisma:377-394` — Consegna

## Related Knowledge

- `belongs-to` → `context.operator-collaboration`
- `persists-as` → `data.model.consegna`
