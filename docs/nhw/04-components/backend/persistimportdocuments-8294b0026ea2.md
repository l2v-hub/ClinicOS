---
id: "component.backend.backend.src.ai.upload.patient-documents.persistimportdocuments"
kind: "typescript-function"
title: "persistImportDocuments"
status: "observed"
summary: "Exported function from backend/src/ai/upload/patient-documents.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/upload/patient-documents.ts"
    symbol: "persistImportDocuments"
    line_start: "28"
    line_end: "64"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/patient-documents.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.patient-documents.persistimportdocuments` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.patient-documents.persistimportdocuments is the canonical typescript-function named persistImportDocuments.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/upload/confirm-service.ts`

## Invariants

The symbol is exported across its module boundary as `persistImportDocuments`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/patient-documents.ts:28-64` — persistImportDocuments

## Related Knowledge

- `belongs-to` → `project.backend`
