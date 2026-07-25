---
id: "value.api.patient-document-permission"
kind: "permission-contract"
title: "Patient document access permission"
status: "observed"
summary: "Document list, upload, and content routes apply per-route patient and operator access checks."
bounded_contexts: []
sources:
  - path: "backend/src/routes/patient-documents.ts"
    confidence: "observed"
  - path: "backend/src/__tests__/patient-documents-entra.test.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.clinical-record"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/__tests__/patient-documents-entra.test.ts"
    confidence: "observed"
tags:
  - "permission-contract"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `value.api.patient-document-permission` represent in ClinicOS?

## Canonical Definition

value.api.patient-document-permission is the canonical permission-contract named Patient document access permission.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Document list, upload, and content routes apply per-route patient and operator access checks.

## Dependencies

Owning knowledge target: `context.clinical-record`.

## Side Effects

Allows or rejects access to protected clinical document metadata and payloads.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/routes/patient-documents.ts`
- `backend/src/__tests__/patient-documents-entra.test.ts`

## Related Knowledge

- `belongs-to` → `context.clinical-record`
