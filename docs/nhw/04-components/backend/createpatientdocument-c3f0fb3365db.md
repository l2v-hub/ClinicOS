---
id: "component.backend.backend.src.ai.upload.patient-documents.createpatientdocument"
kind: "typescript-function"
title: "createPatientDocument"
status: "observed"
summary: "Exported function from backend/src/ai/upload/patient-documents.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/upload/patient-documents.ts"
    symbol: "createPatientDocument"
    line_start: "71"
    line_end: "111"
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

What does `component.backend.backend.src.ai.upload.patient-documents.createpatientdocument` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.patient-documents.createpatientdocument is the canonical typescript-function named createPatientDocument.

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

The symbol is exported across its module boundary as `createPatientDocument`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/patient-documents.ts:71-111` — createPatientDocument

## Related Knowledge

- `belongs-to` → `project.backend`
