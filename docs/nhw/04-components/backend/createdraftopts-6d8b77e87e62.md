---
id: "component.backend.backend.src.intake.draft-service.createdraftopts"
kind: "typescript-interface"
title: "CreateDraftOpts"
status: "observed"
summary: "Exported interface from backend/src/intake/draft-service.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/intake/draft-service.ts"
    symbol: "CreateDraftOpts"
    line_start: "41"
    line_end: "45"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/intake/draft-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.intake.draft-service.createdraftopts` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.draft-service.createdraftopts is the canonical typescript-interface named CreateDraftOpts.

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

The symbol is exported across its module boundary as `CreateDraftOpts`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/draft-service.ts:41-45` — CreateDraftOpts

## Related Knowledge

- `belongs-to` → `project.backend`
