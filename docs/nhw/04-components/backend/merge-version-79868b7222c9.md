---
id: 'component.backend.backend.src.ai.merge.merge-version'
kind: 'typescript-constant'
title: 'MERGE_VERSION'
status: 'observed'
summary: 'Exported constant from backend/src/ai/merge.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/merge.ts'
    symbol: 'MERGE_VERSION'
    line_start: '11'
    line_end: '11'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/merge.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.merge.merge-version` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.merge.merge-version is the canonical typescript-constant named MERGE_VERSION.

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

The symbol is exported across its module boundary as `MERGE_VERSION`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/merge.ts:11-11` — MERGE_VERSION

## Related Knowledge

- `belongs-to` → `project.backend`
