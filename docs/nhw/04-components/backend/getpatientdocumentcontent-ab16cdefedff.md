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
    target: "project.backend"
    evidence: "backend/src/ai/upload/patient-documents.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
