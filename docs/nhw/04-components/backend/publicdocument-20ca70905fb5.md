---
id: "component.backend.backend.src.ai.upload.job-service.publicdocument"
kind: "typescript-interface"
title: "PublicDocument"
status: "observed"
summary: "Exported interface from backend/src/ai/upload/job-service.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "PublicDocument"
    line_start: "56"
    line_end: "66"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/job-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.job-service.publicdocument` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.publicdocument is the canonical typescript-interface named PublicDocument.

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

The symbol is exported across its module boundary as `PublicDocument`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:56-66` — PublicDocument

## Related Knowledge

- `belongs-to` → `project.backend`
