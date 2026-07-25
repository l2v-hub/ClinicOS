---
id: 'system.lifecycle'
kind: 'system-view'
title: 'System Lifecycle'
status: 'inferred'
summary: 'System view of ClinicOS startup, readiness, operation, and shutdown.'
bounded_contexts: []
sources:
  - path: 'package.json'
    confidence: 'observed'
  - path: 'backend/src/app.ts'
    confidence: 'observed'
  - path: 'frontend/src/App.tsx'
    confidence: 'observed'
  - path: 'clinicos-ai-runtime/clinicos_ai/api/app.py'
    confidence: 'observed'
  - path: 'prisma/schema.prisma'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'package.json,backend/src/app.ts,frontend/src/App.tsx,clinicos-ai-runtime/clinicos_ai/api/app.py,prisma/schema.prisma'
    confidence: 'inferred'
tags:
  - 'architecture'
  - 'system-view'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
inference_rule: 'Reconstructed from runtime composition roots and catalogs for startup, readiness, operation, and shutdown.'
---

## Question Answered

What does `system.lifecycle` represent in ClinicOS?

## Canonical Definition

system.lifecycle is the canonical system-view named System Lifecycle.

## Inputs

Executable composition roots and project manifests.

## Outputs

A canonical view of startup, readiness, operation, and shutdown.

## Dependencies

- `project.agent-team`
- `project.backend`
- `project.clinicos`
- `project.clinicos-ai-runtime`
- `project.frontend`
- `project.prisma`
- `project.repository-automation`

## Side Effects

None observed

## Consumers

Architecture retrieval and impact analysis.

## Invariants

Runtime code takes precedence over lower-ranked narrative sources.

## Failure Modes

None observed

## Evidence

- `package.json`
- `backend/src/app.ts`
- `frontend/src/App.tsx`
- `clinicos-ai-runtime/clinicos_ai/api/app.py`
- `prisma/schema.prisma`

## Related Knowledge

- `belongs-to` → `system.clinicos`
