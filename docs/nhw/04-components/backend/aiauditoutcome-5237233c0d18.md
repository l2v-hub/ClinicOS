---
id: "component.backend.backend.src.ai.audit-store.aiauditoutcome"
kind: "typescript-type-alias"
title: "AiAuditOutcome"
status: "observed"
summary: "Exported type-alias from backend/src/ai/audit-store.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/audit-store.ts"
    symbol: "AiAuditOutcome"
    line_start: "15"
    line_end: "15"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/audit-store.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.audit-store.aiauditoutcome` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.audit-store.aiauditoutcome is the canonical typescript-type-alias named AiAuditOutcome.

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

The symbol is exported across its module boundary as `AiAuditOutcome`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/audit-store.ts:15-15` — AiAuditOutcome

## Related Knowledge

- `belongs-to` → `project.backend`
