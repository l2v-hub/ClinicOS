---
id: "component.backend.backend.src.ai.upload.patient-documents.listpatientdocuments"
kind: "typescript-function"
title: "listPatientDocuments"
status: "observed"
summary: "Exported function from backend/src/ai/upload/patient-documents.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/upload/patient-documents.ts"
    symbol: "listPatientDocuments"
    line_start: "114"
    line_end: "131"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.patient-documents.listpatientdocuments` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.patient-documents.listpatientdocuments is the canonical typescript-function named listPatientDocuments.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/services.ts`
- `backend/src/routes/patient-documents.ts`

## Invariants

The symbol is exported across its module boundary as `listPatientDocuments`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/patient-documents.ts:114-131` — listPatientDocuments

## Related Knowledge

- `belongs-to` → `project.backend`
