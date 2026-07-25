---
id: "component.backend.backend.src.ai.audit-store.setauditpersistence"
kind: "typescript-function"
title: "setAuditPersistence"
status: "observed"
summary: "Exported function from backend/src/ai/audit-store.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/audit-store.ts"
    symbol: "setAuditPersistence"
    line_start: "70"
    line_end: "72"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.ai.audit-store.setauditpersistence` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.audit-store.setauditpersistence is the canonical typescript-function named setAuditPersistence.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/__tests__/operational-audit.test.ts`
- `backend/src/ai/__tests__/voice-privacy-logging.test.ts`

## Invariants

The symbol is exported across its module boundary as `setAuditPersistence`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/audit-store.ts:70-72` — setAuditPersistence

## Related Knowledge

- `belongs-to` → `project.backend`
