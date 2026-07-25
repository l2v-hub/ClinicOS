---
id: "component.backend.backend.src.ai.upload.patient-documents.publicpatientdocument"
kind: "typescript-interface"
title: "PublicPatientDocument"
status: "observed"
summary: "Exported interface from backend/src/ai/upload/patient-documents.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/upload/patient-documents.ts"
    symbol: "PublicPatientDocument"
    line_start: "12"
    line_end: "22"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/patient-documents.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.patient-documents.publicpatientdocument` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.patient-documents.publicpatientdocument is the canonical typescript-interface named PublicPatientDocument.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `PublicPatientDocument`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/patient-documents.ts:12-22` — PublicPatientDocument

## Related Knowledge

- `belongs-to` → `project.backend`
