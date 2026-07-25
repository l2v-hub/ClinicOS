---
id: "system.cross-cutting-concerns"
kind: "system-view"
title: "Cross-Cutting Concerns"
status: "inferred"
summary: "System view of ClinicOS authentication, logging, errors, caching, and quality."
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
inference_rule: "Reconstructed from runtime composition roots and catalogs for authentication, logging, errors, caching, and quality."
---

## Question Answered

What does `system.cross-cutting-concerns` represent in ClinicOS?

## Canonical Definition

system.cross-cutting-concerns is the canonical system-view named Cross-Cutting Concerns.

## Inputs

Executable composition roots and project manifests.

## Outputs

A canonical view of authentication, logging, errors, caching, and quality.

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
