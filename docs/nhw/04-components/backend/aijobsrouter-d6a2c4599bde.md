---
id: "component.backend.backend.src.routes.ai-jobs.aijobsrouter"
kind: "typescript-constant"
title: "aiJobsRouter"
status: "observed"
summary: "Exported constant from backend/src/routes/ai-jobs.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/routes/ai-jobs.ts"
    symbol: "aiJobsRouter"
    line_start: "39"
    line_end: "39"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/ai-jobs.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.routes.ai-jobs.aijobsrouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.ai-jobs.aijobsrouter is the canonical typescript-constant named aiJobsRouter.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/app.ts`

## Invariants

The symbol is exported across its module boundary as `aiJobsRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/ai-jobs.ts:39-39` — aiJobsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
