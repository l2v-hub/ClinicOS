---
id: 'component.backend.backend.src.ai.gateway.types.patientsearchresult'
kind: 'typescript-interface'
title: 'PatientSearchResult'
status: 'observed'
summary: 'Exported interface from backend/src/ai/gateway/types.ts.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/ai/gateway/types.ts'
    symbol: 'PatientSearchResult'
    line_start: '58'
    line_end: '64'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/gateway/types.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.types.patientsearchresult` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.types.patientsearchresult is the canonical typescript-interface named PatientSearchResult.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `PatientSearchResult`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/types.ts:58-64` — PatientSearchResult

## Related Knowledge

- `belongs-to` → `project.backend`
