---
id: "component.backend.backend.src.ai.gateway.services.getpatientdemographics"
kind: "typescript-function"
title: "getPatientDemographics"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/services.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/gateway/services.ts"
    symbol: "getPatientDemographics"
    line_start: "152"
    line_end: "175"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.services.getpatientdemographics` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.services.getpatientdemographics is the canonical typescript-function named getPatientDemographics.

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

The symbol is exported across its module boundary as `getPatientDemographics`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/services.ts:152-175` — getPatientDemographics

## Related Knowledge

- `belongs-to` → `project.backend`
