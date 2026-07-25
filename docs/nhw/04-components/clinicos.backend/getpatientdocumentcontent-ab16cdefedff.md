---
id: "component.backend.backend.src.ai.upload.patient-documents.getpatientdocumentcontent"
kind: "typescript-function"
title: "getPatientDocumentContent"
status: "observed"
summary: "Exported function from backend/src/ai/upload/patient-documents.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/upload/patient-documents.ts"
    symbol: "getPatientDocumentContent"
    line_start: "134"
    line_end: "148"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/upload/patient-documents.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.patient-documents.getpatientdocumentcontent` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.patient-documents.getpatientdocumentcontent is the canonical typescript-function named getPatientDocumentContent.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/patient-documents.ts`

## Invariants

The symbol is exported across its module boundary as `getPatientDocumentContent`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/patient-documents.ts:134-148` — getPatientDocumentContent

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
