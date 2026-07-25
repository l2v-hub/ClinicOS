---
id: "entity.importjob"
kind: "domain-entity"
title: "ImportJob"
status: "inferred"
summary: "Business entity persisted by the ImportJob Prisma model."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "prisma/schema.prisma"
    symbol: "ImportJob"
    line_start: "457"
    line_end: "491"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.intake-document-processing"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.importjob"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "importjob"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.importjob` represent in ClinicOS?

## Canonical Definition

entity.importjob is the canonical domain-entity named ImportJob.

## Inputs

- `id: String` (id, required, default=cuid())
- `status: String` (required, default="uploaded")
- `stage: String?` (nullable)
- `currentFileName: String?` (nullable)
- `errorCode: String?` (nullable)
- `attempts: Int` (required, default=0)
- `startedAt: DateTime?` (nullable)
- `idempotencyKey: String?` (unique, nullable)
- `maxFiles: Int` (required)
- `maxTotalBytes: Int` (required)
- `totalBytes: Int` (required, default=0)
- `error: String?` (nullable)
- `resultData: Json?` (nullable)
- `model: String?` (nullable)
- `schemaVersion: String?` (nullable)
- `promptVersion: String?` (nullable)
- `createdById: String?` (nullable)
- `createdPatientId: String?` (nullable)
- `confirmedAt: DateTime?` (nullable)
- `expiresAt: DateTime` (required)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `documents: ImportDocument[]` (required, list)
- `auditEvents: ImportAudit[]` (required, list)

## Outputs

Lifecycle state persisted as `data.model.importjob`.

## Dependencies

- - `documents` → `ImportDocument` (many; onDelete=unspecified)
- - `auditEvents` → `ImportAudit` (many; onDelete=unspecified)

## Side Effects

Creation, mutation, and deletion alter persistent clinical state.

## Consumers

Endpoint and UI consumers are navigable through graph relations to the persistence model.

## Invariants

Identity, nullability, uniqueness, defaults, and relations are authoritative in `prisma/schema.prisma`.

## Failure Modes

Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.

## Evidence

- `prisma/schema.prisma:457-491` — ImportJob

## Related Knowledge

- `belongs-to` → `context.intake-document-processing`
- `persists-as` → `data.model.importjob`
