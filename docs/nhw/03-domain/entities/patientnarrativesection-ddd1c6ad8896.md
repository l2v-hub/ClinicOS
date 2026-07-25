---
id: "entity.patientnarrativesection"
kind: "domain-entity"
title: "PatientNarrativeSection"
status: "inferred"
summary: "Business entity persisted by the PatientNarrativeSection Prisma model."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "prisma/schema.prisma"
    symbol: "PatientNarrativeSection"
    line_start: "105"
    line_end: "126"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.patient-registry"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
  - type: "persists-as"
    target: "data.model.patientnarrativesection"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "domain-entity"
  - "patientnarrativesection"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
inference_rule: "Business entity reconstructed from the current Prisma model and its executable consumers."
---

## Question Answered

What does `entity.patientnarrativesection` represent in ClinicOS?

## Canonical Definition

entity.patientnarrativesection is the canonical domain-entity named PatientNarrativeSection.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (required)
- `sectionKey: String` (required)
- `detectedHeading: String?` (nullable)
- `originalText: String` (required, default="")
- `reviewedText: String?` (nullable)
- `annotations: Json?` (nullable)
- `sourceReferences: Json?` (nullable)
- `importJobId: String?` (nullable)
- `reviewStatus: String` (required, default="pending")
- `createdBy: String?` (nullable)
- `updatedBy: String?` (nullable)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)

## Outputs

Lifecycle state persisted as `data.model.patientnarrativesection`.

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

- `prisma/schema.prisma:105-126` — PatientNarrativeSection

## Related Knowledge

- `belongs-to` → `context.patient-registry`
- `persists-as` → `data.model.patientnarrativesection`
