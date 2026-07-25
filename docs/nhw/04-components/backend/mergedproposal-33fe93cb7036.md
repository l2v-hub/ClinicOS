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
    target: "project.backend"
    evidence: "backend/src/ai/merge.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
