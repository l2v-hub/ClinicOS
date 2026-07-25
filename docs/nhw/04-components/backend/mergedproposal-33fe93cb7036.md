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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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
