---
id: "component.backend.backend.src.ai.auth.authedrequest"
kind: "typescript-interface"
title: "AuthedRequest"
status: "observed"
summary: "Exported interface from backend/src/ai/auth.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/ai/auth.ts"
    symbol: "AuthedRequest"
    line_start: "20"
    line_end: "22"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/auth.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.auth.authedrequest` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.auth.authedrequest is the canonical typescript-interface named AuthedRequest.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/__tests__/patient-documents-entra.test.ts`
- `backend/src/ai/rate-limit.ts`
- `backend/src/lib/entra-auth.ts`
- `backend/src/routes/ai-actions.ts`
- `backend/src/routes/ai-assistant-public.ts`
- `backend/src/routes/ai-audit.ts`
- `backend/src/routes/ai-jobs.ts`
- `backend/src/routes/ai-voice.ts`
- `backend/src/routes/intake-drafts.ts`
- `backend/src/routes/patient-documents.ts`

## Invariants

The symbol is exported across its module boundary as `AuthedRequest`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/auth.ts:20-22` — AuthedRequest

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
