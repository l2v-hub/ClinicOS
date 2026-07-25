---
id: "component.backend.backend.src.ai.upload.validation.accepted-extensions"
kind: "typescript-constant"
title: "ACCEPTED_EXTENSIONS"
status: "observed"
summary: "Exported constant from backend/src/ai/upload/validation.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/validation.ts"
    symbol: "ACCEPTED_EXTENSIONS"
    line_start: "10"
    line_end: "22"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/validation.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.validation.accepted-extensions` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.validation.accepted-extensions is the canonical typescript-constant named ACCEPTED_EXTENSIONS.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/upload.test.ts`

## Invariants

The symbol is exported across its module boundary as `ACCEPTED_EXTENSIONS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/validation.ts:10-22` — ACCEPTED_EXTENSIONS

## Related Knowledge

- `belongs-to` → `project.backend`
