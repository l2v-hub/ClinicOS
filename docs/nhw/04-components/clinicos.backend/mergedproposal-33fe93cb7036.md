---
id: "component.backend.backend.src.ai.merge.mergedproposal"
kind: "typescript-interface"
title: "MergedProposal"
status: "observed"
summary: "Exported interface from backend/src/ai/merge.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/merge.ts"
    symbol: "MergedProposal"
    line_start: "60"
    line_end: "64"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/merge.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.merge.mergedproposal` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.merge.mergedproposal is the canonical typescript-interface named MergedProposal.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/upload/job-service.ts`

## Invariants

The symbol is exported across its module boundary as `MergedProposal`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/merge.ts:60-64` — MergedProposal

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
