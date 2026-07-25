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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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
