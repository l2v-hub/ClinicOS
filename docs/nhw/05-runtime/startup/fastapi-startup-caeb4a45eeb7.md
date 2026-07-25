---
id: "runtime.ai-runtime.fastapi-startup"
kind: "runtime-startup"
title: "FastAPI runtime startup"
status: "observed"
summary: "Python entry point starts Uvicorn and exposes the FastAPI application and health contract."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/main.py"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/main.py,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
tags:
  - "runtime-startup"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `runtime.ai-runtime.fastapi-startup` represent in ClinicOS?

## Canonical Definition

runtime.ai-runtime.fastapi-startup is the canonical runtime-startup named FastAPI runtime startup.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Python entry point starts Uvicorn and exposes the FastAPI application and health contract.

## Dependencies

Owning knowledge target: `project.clinicos-ai-runtime`.

## Side Effects

Binds the runtime HTTP listener and creates process-local runtime state.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `clinicos-ai-runtime/clinicos_ai/main.py`
- `clinicos-ai-runtime/clinicos_ai/api/app.py`

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
