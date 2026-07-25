---
id: 'component.backend.backend.src.ai.gateway.services.getpatientnarrativesectionsg'
kind: 'typescript-function'
title: 'getPatientNarrativeSectionsG'
status: 'observed'
summary: 'Exported function from backend/src/ai/gateway/services.ts.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/ai/gateway/services.ts'
    symbol: 'getPatientNarrativeSectionsG'
    line_start: '199'
    line_end: '225'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/gateway/services.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.services.getpatientnarrativesectionsg` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.services.getpatientnarrativesectionsg is the canonical typescript-function named getPatientNarrativeSectionsG.

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

The symbol is exported across its module boundary as `getPatientNarrativeSectionsG`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/services.ts:199-225` — getPatientNarrativeSectionsG

## Related Knowledge

- `belongs-to` → `project.backend`
