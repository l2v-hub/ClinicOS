---
id: "component.backend.backend.src.ai.gateway.services.getpatientdocumentsg"
kind: "typescript-function"
title: "getPatientDocumentsG"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/services.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/gateway/services.ts"
    symbol: "getPatientDocumentsG"
    line_start: "313"
    line_end: "330"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/services.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.services.getpatientdocumentsg` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.services.getpatientdocumentsg is the canonical typescript-function named getPatientDocumentsG.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `getPatientDocumentsG`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/services.ts:313-330` — getPatientDocumentsG

## Related Knowledge

- `belongs-to` → `project.backend`
