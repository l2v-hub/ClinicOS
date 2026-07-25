---
id: "component.backend.backend.src.ai.audit-store.operationalauditinput"
kind: "typescript-interface"
title: "OperationalAuditInput"
status: "observed"
summary: "Exported interface from backend/src/ai/audit-store.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/audit-store.ts"
    symbol: "OperationalAuditInput"
    line_start: "95"
    line_end: "112"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/audit-store.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.audit-store.operationalauditinput` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.audit-store.operationalauditinput is the canonical typescript-interface named OperationalAuditInput.

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

The symbol is exported across its module boundary as `OperationalAuditInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/audit-store.ts:95-112` — OperationalAuditInput

## Related Knowledge

- `belongs-to` → `project.backend`
