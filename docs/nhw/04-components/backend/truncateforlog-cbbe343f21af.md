---
id: "component.backend.backend.src.ai.redact.truncateforlog"
kind: "typescript-function"
title: "truncateForLog"
status: "observed"
summary: "Exported function from backend/src/ai/redact.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/redact.ts"
    symbol: "truncateForLog"
    line_start: "23"
    line_end: "28"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/redact.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.redact.truncateforlog` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.redact.truncateforlog is the canonical typescript-function named truncateForLog.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/config.test.ts`
- `backend/src/ai/providers/google-gemma.ts`

## Invariants

The symbol is exported across its module boundary as `truncateForLog`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/redact.ts:23-28` — truncateForLog

## Related Knowledge

- `belongs-to` → `project.backend`
