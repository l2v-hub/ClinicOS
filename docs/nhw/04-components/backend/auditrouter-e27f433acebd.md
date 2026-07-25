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
    target: "project.backend"
    evidence: "backend/src/routes/ai-audit.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
