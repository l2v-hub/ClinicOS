---
id: "runtime.system.observability"
kind: "runtime-observability"
title: "Runtime logging and health observability"
status: "observed"
summary: "Backend and AI runtime expose health endpoints and log configuration-safe startup and failure information."
bounded_contexts: []
sources:
  - path: "backend/src/server.ts"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/models/env_config.py"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/server.ts,clinicos-ai-runtime/clinicos_ai/models/env_config.py,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
tags:
  - "runtime-observability"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `runtime.system.observability` represent in ClinicOS?

## Canonical Definition

runtime.system.observability is the canonical runtime-observability named Runtime logging and health observability.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Backend and AI runtime expose health endpoints and log configuration-safe startup and failure information.

## Dependencies

Owning knowledge target: `system.clinicos`.

## Side Effects

Emits console and health telemetry without copying credential values.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/server.ts`
- `clinicos-ai-runtime/clinicos_ai/models/env_config.py`
- `clinicos-ai-runtime/clinicos_ai/api/app.py`

## Related Knowledge

- `belongs-to` → `system.clinicos`
