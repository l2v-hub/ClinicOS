---
id: "runtime.frontend.initialization"
kind: "runtime-startup"
title: "Frontend initialization"
status: "observed"
summary: "Vite browser entry point mounts the React application."
bounded_contexts: []
sources:
  - path: "frontend/src/main.tsx"
    confidence: "observed"
  - path: "frontend/src/App.tsx"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/main.tsx,frontend/src/App.tsx"
    confidence: "observed"
tags:
  - "runtime-startup"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `runtime.frontend.initialization` represent in ClinicOS?

## Canonical Definition

runtime.frontend.initialization is the canonical runtime-startup named Frontend initialization.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Vite browser entry point mounts the React application.

## Dependencies

Owning knowledge target: `project.frontend`.

## Side Effects

Creates the browser React root and starts client-side application state.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`

## Related Knowledge

- `belongs-to` → `project.frontend`
