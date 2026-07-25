---
id: "component.backend.backend.src.routes.patient-documents.documentauthmode"
kind: "typescript-type-alias"
title: "DocumentAuthMode"
status: "observed"
summary: "Exported type-alias from backend/src/routes/patient-documents.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/routes/patient-documents.ts"
    symbol: "DocumentAuthMode"
    line_start: "46"
    line_end: "46"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-documents.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.routes.patient-documents.documentauthmode` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.patient-documents.documentauthmode is the canonical typescript-type-alias named DocumentAuthMode.

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

The symbol is exported across its module boundary as `DocumentAuthMode`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/patient-documents.ts:46-46` — DocumentAuthMode

## Related Knowledge

- `belongs-to` → `project.backend`
