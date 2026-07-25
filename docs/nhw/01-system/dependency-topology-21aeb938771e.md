---
id: "system.dependency-topology"
kind: "system-view"
title: "Dependency Topology"
status: "inferred"
summary: "System view of ClinicOS project and integration dependencies."
bounded_contexts: []
sources:
  - path: "package.json"
    confidence: "observed"
  - path: "backend/src/app.ts"
    confidence: "observed"
  - path: "frontend/src/App.tsx"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "package.json,backend/src/app.ts,frontend/src/App.tsx,clinicos-ai-runtime/clinicos_ai/api/app.py,prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "architecture"
  - "system-view"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
inference_rule: "Reconstructed from runtime composition roots and catalogs for project and integration dependencies."
---

## Question Answered

What does `system.dependency-topology` represent in ClinicOS?

## Canonical Definition

system.dependency-topology is the canonical system-view named Dependency Topology.

## Inputs

Executable composition roots and project manifests.

## Outputs

A canonical view of project and integration dependencies.

## Dependencies

- `project.clinicos.backend`
- `project.agent-team`
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
