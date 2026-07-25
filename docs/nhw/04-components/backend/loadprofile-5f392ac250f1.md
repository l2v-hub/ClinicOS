---
id: "component.backend.backend.src.ai.sections.profile.loadprofile"
kind: "typescript-function"
title: "loadProfile"
status: "observed"
summary: "Exported function from backend/src/ai/sections/profile.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/profile.ts"
    symbol: "loadProfile"
    line_start: "84"
    line_end: "92"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/profile.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.profile.loadprofile` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.profile.loadprofile is the canonical typescript-function named loadProfile.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/sections/index.ts`
- `backend/src/ai/sections/validate.ts`

## Invariants

The symbol is exported across its module boundary as `loadProfile`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/profile.ts:84-92` — loadProfile

## Related Knowledge

- `belongs-to` → `project.backend`
