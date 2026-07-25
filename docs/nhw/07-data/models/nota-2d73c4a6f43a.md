---
id: "data.model.nota"
kind: "data-model"
title: "Nota"
status: "observed"
summary: "Prisma persistence model Nota."
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
    target: "project.prisma"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
tags:
  - "prisma"
  - "database-model"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `data.model.nota` represent in ClinicOS?

## Canonical Definition

data.model.nota is the canonical data-model named Nota.

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

Persisted PostgreSQL row for `Nota`.

## Dependencies

None observed

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `autoreId`: required
- `autoreNome`: required
- `destinatarioId`: required
- `destinatarioNome`: required
- `priorita`: required
- `messaggio`: required
- `stato`: required
- `createdAt`: required
- `updatedAt`: required
- index on `stato`
- index on `destinatarioId`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:396-412` — Nota

## Related Knowledge

- `belongs-to` → `project.prisma`
