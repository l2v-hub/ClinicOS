---
id: "component.backend.backend.src.ai.audit-store.recordauditevent"
kind: "typescript-function"
title: "recordAuditEvent"
status: "observed"
summary: "Exported function from backend/src/ai/audit-store.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/audit-store.ts"
    symbol: "recordAuditEvent"
    line_start: "76"
    line_end: "87"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/audit-store.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.audit-store.recordauditevent` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.audit-store.recordauditevent is the canonical typescript-function named recordAuditEvent.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/audit.ts`
- `backend/src/ai/voice/audit.ts`

## Invariants

The symbol is exported across its module boundary as `recordAuditEvent`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/audit-store.ts:76-87` — recordAuditEvent

## Related Knowledge

- `belongs-to` → `project.backend`
