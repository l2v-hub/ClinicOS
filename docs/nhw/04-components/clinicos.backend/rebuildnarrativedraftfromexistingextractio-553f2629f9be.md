---
id: "component.backend.backend.src.ai.upload.job-service.rebuildnarrativedraftfromexistingextraction"
kind: "typescript-function"
title: "rebuildNarrativeDraftFromExistingExtraction"
status: "observed"
summary: "Exported function from backend/src/ai/upload/job-service.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "rebuildNarrativeDraftFromExistingExtraction"
    line_start: "924"
    line_end: "957"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/upload/job-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.job-service.rebuildnarrativedraftfromexistingextraction` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.rebuildnarrativedraftfromexistingextraction is the canonical typescript-function named rebuildNarrativeDraftFromExistingExtraction.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `rebuildNarrativeDraftFromExistingExtraction`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:924-957` — rebuildNarrativeDraftFromExistingExtraction

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
