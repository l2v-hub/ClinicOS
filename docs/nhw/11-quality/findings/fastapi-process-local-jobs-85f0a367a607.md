---
id: "finding.state.fastapi-process-local-jobs"
kind: "architectural-finding"
title: "FastAPI process-local job state"
status: "observed"
summary: "AI runtime document-job state is process-local rather than persisted in an external queue or database."
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
  - "architectural-finding"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `finding.state.fastapi-process-local-jobs` represent in ClinicOS?

## Canonical Definition

finding.state.fastapi-process-local-jobs is the canonical architectural-finding named FastAPI process-local job state.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

AI runtime document-job state is process-local rather than persisted in an external queue or database.

## Dependencies

Owning knowledge target: `project.clinicos-ai-runtime`.

## Side Effects

Process restart, horizontal scaling, or request routing can affect job visibility and durability.

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
