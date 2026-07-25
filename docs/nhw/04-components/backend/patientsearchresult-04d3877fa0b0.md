---
id: "component.backend.backend.src.ai.gateway.types.patientsearchresult"
kind: "typescript-interface"
title: "PatientSearchResult"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/types.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/gateway/types.ts"
    symbol: "PatientSearchResult"
    line_start: "58"
    line_end: "64"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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
