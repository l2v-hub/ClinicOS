---
id: "entity.importdocument"
kind: "domain-entity"
title: "ImportDocument"
status: "inferred"
summary: "Business entity persisted by the ImportDocument Prisma model."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "prisma/schema.prisma"
    symbol: "ImportDocument"
    line_start: "507"
    line_end: "530"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.clinical-record"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.importdocument"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "importdocument"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.importdocument` represent in ClinicOS?

## Canonical Definition

entity.importdocument is the canonical domain-entity named ImportDocument.

## Inputs

- `id: String` (id, required, default=cuid())
- `jobId: String` (required)
- `filename: String` (required)
- `mimeType: String` (required)
- `sizeBytes: Int` (required)
- `sha256: String` (required)
- `storagePath: String` (required)
- `dataBase64: String?` (nullable)
- `sortOrder: Int` (required, default=0)
- `logicalDoc: String?` (nullable)
- `status: String` (required, default="uploaded")
- `rejectReason: String?` (nullable)
- `errorCode: String?` (nullable)
- `errorMessage: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `job: ImportJob` (required)

## Outputs

Lifecycle state persisted as `data.model.importdocument`.

## Dependencies

- - `job` → `ImportJob` (required-one; onDelete=Cascade)

## Side Effects

Creation, mutation, and deletion alter persistent clinical state.

## Consumers

Endpoint and UI consumers are navigable through graph relations to the persistence model.

## Invariants

Identity, nullability, uniqueness, defaults, and relations are authoritative in `prisma/schema.prisma`.

## Failure Modes

Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.

## Evidence

- `prisma/schema.prisma:507-530` — ImportDocument

## Related Knowledge

- `belongs-to` → `context.clinical-record`
- `persists-as` → `data.model.importdocument`
