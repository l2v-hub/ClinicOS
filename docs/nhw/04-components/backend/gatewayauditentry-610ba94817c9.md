---
id: "component.backend.backend.src.ai.gateway.audit.gatewayauditentry"
kind: "typescript-interface"
title: "GatewayAuditEntry"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/audit.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/gateway/audit.ts"
    symbol: "GatewayAuditEntry"
    line_start: "7"
    line_end: "16"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/audit.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.audit.gatewayauditentry` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.audit.gatewayauditentry is the canonical typescript-interface named GatewayAuditEntry.

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

The symbol is exported across its module boundary as `GatewayAuditEntry`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/audit.ts:7-16` — GatewayAuditEntry

## Related Knowledge

- `belongs-to` → `project.backend`
