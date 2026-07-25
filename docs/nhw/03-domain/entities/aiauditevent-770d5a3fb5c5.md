---
id: 'entity.aiauditevent'
kind: 'domain-entity'
title: 'AiAuditEvent'
status: 'inferred'
summary: 'Business entity persisted by the AiAuditEvent Prisma model.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'prisma/schema.prisma'
    symbol: 'AiAuditEvent'
    line_start: '535'
    line_end: '551'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'context.ai-assistance'
    evidence: 'prisma/schema.prisma'
    confidence: 'inferred'
  - type: 'persists-as'
    target: 'data.model.aiauditevent'
    evidence: 'prisma/schema.prisma'
    confidence: 'inferred'
tags:
  - 'domain-entity'
  - 'aiauditevent'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
inference_rule: 'Business entity reconstructed from the current Prisma model and its executable consumers.'
---

## Question Answered

What does `entity.aiauditevent` represent in ClinicOS?

## Canonical Definition

entity.aiauditevent is the canonical domain-entity named AiAuditEvent.

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

Lifecycle state persisted as `data.model.aiauditevent`.

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

- `prisma/schema.prisma:535-551` — AiAuditEvent

## Related Knowledge

- `belongs-to` → `context.ai-assistance`
- `persists-as` → `data.model.aiauditevent`
