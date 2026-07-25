---
id: "runtime.ai-runtime.in-process-job-state"
kind: "runtime-state"
title: "FastAPI in-process document-job state"
status: "observed"
summary: "Document-job endpoints keep runtime job and event state inside the FastAPI process."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "observed"
tags:
  - "runtime-state"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `runtime.ai-runtime.in-process-job-state` represent in ClinicOS?

## Canonical Definition

runtime.ai-runtime.in-process-job-state is the canonical runtime-state named FastAPI in-process document-job state.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Document-job endpoints keep runtime job and event state inside the FastAPI process.

## Dependencies

Owning knowledge target: `project.clinicos-ai-runtime`.

## Side Effects

Mutates process-local job, result, event, retry, and cancellation state.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `clinicos-ai-runtime/clinicos_ai/api/app.py`

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
