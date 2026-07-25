---
id: 'component.backend.backend.src.ai.sections.profile.documentprofile'
kind: 'typescript-interface'
title: 'DocumentProfile'
status: 'observed'
summary: 'Exported interface from backend/src/ai/sections/profile.ts.'
bounded_contexts:
  - 'context.clinical-record'
sources:
  - path: 'backend/src/ai/sections/profile.ts'
    symbol: 'DocumentProfile'
    line_start: '65'
    line_end: '75'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/sections/profile.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.sections.profile.documentprofile` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.profile.documentprofile is the canonical typescript-interface named DocumentProfile.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/sections/prompt.ts`
- `backend/src/ai/sections/validate.ts`

## Invariants

The symbol is exported across its module boundary as `DocumentProfile`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/profile.ts:65-75` — DocumentProfile

## Related Knowledge

- `belongs-to` → `project.backend`
