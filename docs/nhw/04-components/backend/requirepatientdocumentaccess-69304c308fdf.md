---
id: "component.backend.backend.src.routes.patient-documents.requirepatientdocumentaccess"
kind: "typescript-function"
title: "requirePatientDocumentAccess"
status: "observed"
summary: "Exported function from backend/src/routes/patient-documents.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-documents.ts"
    symbol: "requirePatientDocumentAccess"
    line_start: "64"
    line_end: "100"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-documents.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.routes.patient-documents.requirepatientdocumentaccess` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.patient-documents.requirepatientdocumentaccess is the canonical typescript-function named requirePatientDocumentAccess.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/__tests__/patient-documents-entra.test.ts`
- `backend/src/ai/__tests__/patient-documents-security.test.ts`

## Invariants

The symbol is exported across its module boundary as `requirePatientDocumentAccess`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/patient-documents.ts:64-100` — requirePatientDocumentAccess

## Related Knowledge

- `belongs-to` → `project.backend`
