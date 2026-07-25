---
id: "component.backend.backend.src.ai.upload.job-service.publicjob"
kind: "typescript-interface"
title: "PublicJob"
status: "observed"
summary: "Exported interface from backend/src/ai/upload/job-service.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "PublicJob"
    line_start: "68"
    line_end: "88"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.job-service.publicjob` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.publicjob is the canonical typescript-interface named PublicJob.

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

The symbol is exported across its module boundary as `PublicJob`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:68-88` — PublicJob

## Related Knowledge

- `belongs-to` → `project.backend`
