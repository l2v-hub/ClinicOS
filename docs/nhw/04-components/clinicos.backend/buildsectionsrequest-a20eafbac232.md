---
id: "component.backend.backend.src.ai.sections.index.buildsectionsrequest"
kind: "typescript-function"
title: "buildSectionsRequest"
status: "observed"
summary: "Exported function from backend/src/ai/sections/index.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/index.ts"
    symbol: "buildSectionsRequest"
    line_start: "20"
    line_end: "26"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/index.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.index.buildsectionsrequest` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.index.buildsectionsrequest is the canonical typescript-function named buildSectionsRequest.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/sections.test.ts`
- `backend/src/ai/upload/job-service.ts`

## Invariants

The symbol is exported across its module boundary as `buildSectionsRequest`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/index.ts:20-26` — buildSectionsRequest

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
