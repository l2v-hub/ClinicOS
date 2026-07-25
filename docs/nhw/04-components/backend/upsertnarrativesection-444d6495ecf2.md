---
id: "component.backend.backend.src.ai.sections.patient-narrative.upsertnarrativesection"
kind: "typescript-function"
title: "upsertNarrativeSection"
status: "observed"
summary: "Exported function from backend/src/ai/sections/patient-narrative.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/sections/patient-narrative.ts"
    symbol: "upsertNarrativeSection"
    line_start: "155"
    line_end: "189"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/patient-narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.patient-narrative.upsertnarrativesection` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.patient-narrative.upsertnarrativesection is the canonical typescript-function named upsertNarrativeSection.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/voice/write-services.ts`
- `backend/src/routes/narrative-sections.ts`

## Invariants

The symbol is exported across its module boundary as `upsertNarrativeSection`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/patient-narrative.ts:155-189` — upsertNarrativeSection

## Related Knowledge

- `belongs-to` → `project.backend`
