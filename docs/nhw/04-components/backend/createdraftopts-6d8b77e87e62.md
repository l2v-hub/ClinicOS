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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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
