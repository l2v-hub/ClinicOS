---
id: "component.backend.backend.src.ai.upload.validation.perfilelimits"
kind: "typescript-interface"
title: "PerFileLimits"
status: "observed"
summary: "Exported interface from backend/src/ai/upload/validation.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/validation.ts"
    symbol: "PerFileLimits"
    line_start: "76"
    line_end: "78"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/upload/validation.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.validation.perfilelimits` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.validation.perfilelimits is the canonical typescript-interface named PerFileLimits.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `PerFileLimits`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/validation.ts:76-78` — PerFileLimits

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
