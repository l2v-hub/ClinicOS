---
id: "system.clinicos"
kind: "system"
title: "ClinicOS"
status: "observed"
summary: "Clinical operations system composed of browser, HTTP API, PostgreSQL schema, AI runtime, and autonomous delivery tooling."
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
  - type: "contains"
    target: "project.agent-team"
    evidence: "package.json,backend/src/app.ts,frontend/src/App.tsx,clinicos-ai-runtime/clinicos_ai/api/app.py,prisma/schema.prisma"
    confidence: "observed"
  - type: "contains"
    target: "project.backend"
    evidence: "package.json,backend/src/app.ts,frontend/src/App.tsx,clinicos-ai-runtime/clinicos_ai/api/app.py,prisma/schema.prisma"
    confidence: "observed"
  - type: "contains"
    target: "project.clinicos"
    evidence: "package.json,backend/src/app.ts,frontend/src/App.tsx,clinicos-ai-runtime/clinicos_ai/api/app.py,prisma/schema.prisma"
    confidence: "observed"
  - type: "contains"
    target: "project.clinicos-ai-runtime"
    evidence: "package.json,backend/src/app.ts,frontend/src/App.tsx,clinicos-ai-runtime/clinicos_ai/api/app.py,prisma/schema.prisma"
    confidence: "observed"
  - type: "contains"
    target: "project.frontend"
    evidence: "package.json,backend/src/app.ts,frontend/src/App.tsx,clinicos-ai-runtime/clinicos_ai/api/app.py,prisma/schema.prisma"
    confidence: "observed"
  - type: "contains"
    target: "project.prisma"
    evidence: "package.json,backend/src/app.ts,frontend/src/App.tsx,clinicos-ai-runtime/clinicos_ai/api/app.py,prisma/schema.prisma"
    confidence: "observed"
  - type: "contains"
    target: "project.repository-automation"
    evidence: "package.json,backend/src/app.ts,frontend/src/App.tsx,clinicos-ai-runtime/clinicos_ai/api/app.py,prisma/schema.prisma"
    confidence: "observed"
tags:
  - "clinicos"
  - "system"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `system.clinicos` represent in ClinicOS?

## Canonical Definition

system.clinicos is the canonical system named ClinicOS.

## Inputs

Operator interactions, clinical data, documents, configuration, and automation tasks.

## Outputs

Clinical workflows, persisted records, AI-assisted results, and delivery evidence.

## Dependencies

- `project.agent-team`
- `project.backend`
- `project.clinicos`
- `project.clinicos-ai-runtime`
- `project.frontend`
- `project.prisma`
- `project.repository-automation`

## Side Effects

Writes PostgreSQL state, emits HTTP responses, invokes model providers, and creates QA evidence.

## Consumers

Clinical operators, administrators, deployment platforms, and autonomous agents.

## Invariants

The Express backend owns primary persistence; the AI runtime is a separately deployed service.

## Failure Modes

Configuration, persistence, authentication, provider, and deployment failures are surfaced by their owning runtime.

## Evidence

- `package.json`
- `backend/src/app.ts`
- `frontend/src/App.tsx`
- `clinicos-ai-runtime/clinicos_ai/api/app.py`
- `prisma/schema.prisma`

## Related Knowledge

- `contains` → `project.agent-team`
- `contains` → `project.backend`
- `contains` → `project.clinicos`
- `contains` → `project.clinicos-ai-runtime`
- `contains` → `project.frontend`
- `contains` → `project.prisma`
- `contains` → `project.repository-automation`
