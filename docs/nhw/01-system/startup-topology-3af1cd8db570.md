---
id: "system.startup-topology"
kind: "system-view"
title: "Startup Topology"
status: "inferred"
summary: "System view of ClinicOS composition and startup order."
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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
inference_rule: "Reconstructed from runtime composition roots and catalogs for composition and startup order."
---

## Question Answered

What does `system.startup-topology` represent in ClinicOS?

## Canonical Definition

system.startup-topology is the canonical system-view named Startup Topology.

## Inputs

Executable composition roots and project manifests.

## Outputs

A canonical view of composition and startup order.

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
