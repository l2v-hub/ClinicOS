---
id: "runtime.backend.internal-ai-authentication"
kind: "runtime-authentication"
title: "Internal AI service-token authentication"
status: "observed"
summary: "Internal AI gateway calls require the shared runtime service token plus serialized user context."
bounded_contexts: []
sources:
  - path: "backend/src/ai/auth.ts"
    confidence: "observed"
  - path: "backend/src/routes/internal-ai.ts"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/auth.ts,backend/src/routes/internal-ai.ts,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
tags:
  - "runtime-authentication"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `runtime.backend.internal-ai-authentication` represent in ClinicOS?

## Canonical Definition

runtime.backend.internal-ai-authentication is the canonical runtime-authentication named Internal AI service-token authentication.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Internal AI gateway calls require the shared runtime service token plus serialized user context.

## Dependencies

Owning knowledge target: `project.backend`.

## Side Effects

Rejects unauthorized internal requests before clinical data gateway access.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/ai/auth.ts`
- `backend/src/routes/internal-ai.ts`
- `clinicos-ai-runtime/clinicos_ai/api/app.py`

## Related Knowledge

- `belongs-to` → `project.backend`
