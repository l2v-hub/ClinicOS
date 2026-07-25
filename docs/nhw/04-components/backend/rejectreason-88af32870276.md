---
id: "component.backend.backend.src.ai.upload.validation.rejectreason"
kind: "typescript-type-alias"
title: "RejectReason"
status: "observed"
summary: "Exported type-alias from backend/src/ai/upload/validation.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/validation.ts"
    symbol: "RejectReason"
    line_start: "49"
    line_end: "50"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/validation.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.validation.rejectreason` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.validation.rejectreason is the canonical typescript-type-alias named RejectReason.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/upload/job-service.ts`

## Invariants

The symbol is exported across its module boundary as `RejectReason`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/validation.ts:49-50` — RejectReason

## Related Knowledge

- `belongs-to` → `project.backend`
