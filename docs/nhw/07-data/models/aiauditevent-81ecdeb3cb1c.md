---
id: "data.model.aiauditevent"
kind: "data-model"
title: "AiAuditEvent"
status: "observed"
summary: "Prisma persistence model AiAuditEvent."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "prisma/schema.prisma"
    symbol: "AiAuditEvent"
    line_start: "535"
    line_end: "551"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `data.model.aiauditevent` represent in ClinicOS?

## Canonical Definition

data.model.aiauditevent is the canonical data-model named AiAuditEvent.

## Inputs

- `id: String` (id, required, default=cuid())
- `requestId: String` (required)
- `operatorId: String` (required)
- `operatorRole: String` (required)
- `patientId: String?` (nullable)
- `actionType: String` (required)
- `kind: String` (required)
- `channel: String` (required)
- `fields: String[]` (required, list)
- `outcome: String` (required)
- `createdAt: DateTime` (required, default=now())

## Outputs

Persisted PostgreSQL row for `AiAuditEvent`.

## Dependencies

None observed

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `requestId`: required
- `operatorId`: required
- `operatorRole`: required
- `actionType`: required
- `kind`: required
- `channel`: required
- `fields`: required
- `outcome`: required
- `createdAt`: required
- index on `operatorId, createdAt`
- index on `patientId, createdAt`
- index on `outcome`

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:535-551` — AiAuditEvent

## Related Knowledge

- `belongs-to` → `project.prisma`
