---
id: "component.backend.backend.src.ai.merge.candidate"
kind: "typescript-interface"
title: "Candidate"
status: "observed"
summary: "Exported interface from backend/src/ai/merge.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/merge.ts"
    symbol: "Candidate"
    line_start: "25"
    line_end: "28"
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

What does `component.backend.backend.src.ai.merge.candidate` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.merge.candidate is the canonical typescript-interface named Candidate.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `Candidate`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/merge.ts:25-28` — Candidate

## Related Knowledge

- `belongs-to` → `project.backend`
