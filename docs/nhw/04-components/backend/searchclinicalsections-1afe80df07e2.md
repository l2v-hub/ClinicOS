---
id: "component.backend.backend.src.ai.gateway.services.searchclinicalsections"
kind: "typescript-function"
title: "searchClinicalSections"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/services.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/gateway/services.ts"
    symbol: "searchClinicalSections"
    line_start: "414"
    line_end: "453"
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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.services.searchclinicalsections` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.services.searchclinicalsections is the canonical typescript-function named searchClinicalSections.

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

The symbol is exported across its module boundary as `searchClinicalSections`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/services.ts:414-453` — searchClinicalSections

## Related Knowledge

- `belongs-to` → `project.backend`
