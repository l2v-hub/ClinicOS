---
id: "component.backend.backend.src.ai.sections.profile.allergy-statuses"
kind: "typescript-constant"
title: "ALLERGY_STATUSES"
status: "observed"
summary: "Exported constant from backend/src/ai/sections/profile.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/profile.ts"
    symbol: "ALLERGY_STATUSES"
    line_start: "49"
    line_end: "55"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/profile.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.profile.allergy-statuses` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.profile.allergy-statuses is the canonical typescript-constant named ALLERGY_STATUSES.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/sections/validate.ts`

## Invariants

The symbol is exported across its module boundary as `ALLERGY_STATUSES`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/profile.ts:49-55` — ALLERGY_STATUSES

## Related Knowledge

- `belongs-to` → `project.backend`
