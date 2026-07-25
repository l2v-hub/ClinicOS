---
id: "component.backend.backend.src.routes.ai-audit.auditrouter"
kind: "typescript-constant"
title: "auditRouter"
status: "observed"
summary: "Exported constant from backend/src/routes/ai-audit.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/routes/ai-audit.ts"
    symbol: "auditRouter"
    line_start: "12"
    line_end: "12"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/routes/ai-audit.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.routes.ai-audit.auditrouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.ai-audit.auditrouter is the canonical typescript-constant named auditRouter.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/app.ts`

## Invariants

The symbol is exported across its module boundary as `auditRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/ai-audit.ts:12-12` — auditRouter

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
