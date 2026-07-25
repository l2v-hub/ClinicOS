---
id: 'component.backend.backend.src.ai.gateway.services.searchdocuments'
kind: 'typescript-function'
title: 'searchDocuments'
status: 'observed'
summary: 'Exported function from backend/src/ai/gateway/services.ts.'
bounded_contexts:
  - 'context.clinical-record'
sources:
  - path: 'backend/src/ai/gateway/services.ts'
    symbol: 'searchDocuments'
    line_start: '455'
    line_end: '486'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/gateway/services.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.services.searchdocuments` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.services.searchdocuments is the canonical typescript-function named searchDocuments.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `searchDocuments`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/services.ts:455-486` — searchDocuments

## Related Knowledge

- `belongs-to` → `project.backend`
