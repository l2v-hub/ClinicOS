---
id: 'component.backend.backend.src.routes.patient-documents.max-upload-bytes'
kind: 'typescript-constant'
title: 'MAX_UPLOAD_BYTES'
status: 'observed'
summary: 'Exported constant from backend/src/routes/patient-documents.ts.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/patient-documents.ts'
    symbol: 'MAX_UPLOAD_BYTES'
    line_start: '25'
    line_end: '25'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/patient-documents.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.routes.patient-documents.max-upload-bytes` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.patient-documents.max-upload-bytes is the canonical typescript-constant named MAX_UPLOAD_BYTES.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/patient-documents-security.test.ts`

## Invariants

The symbol is exported across its module boundary as `MAX_UPLOAD_BYTES`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/patient-documents.ts:25-25` — MAX_UPLOAD_BYTES

## Related Knowledge

- `belongs-to` → `project.backend`
