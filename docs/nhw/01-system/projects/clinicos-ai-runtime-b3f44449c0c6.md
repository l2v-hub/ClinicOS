---
id: "project.clinicos-ai-runtime"
kind: "python-package"
title: "clinicos-ai-runtime"
status: "observed"
summary: "clinicos-ai-runtime project rooted at clinicos-ai-runtime."
bounded_contexts: []
sources:
  - path: "clinicos-ai-runtime/requirements.txt"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "clinicos-ai-runtime/requirements.txt"
    confidence: "observed"
tags:
  - "project"
  - "python-package"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `project.clinicos-ai-runtime` represent in ClinicOS?

## Canonical Definition

project.clinicos-ai-runtime is the canonical python-package named clinicos-ai-runtime.

## Inputs

Manifest: `clinicos-ai-runtime/requirements.txt`.

## Outputs

Runtime or repository capability owned below `clinicos-ai-runtime`.

## Dependencies

- fastapi>=0.110
- uvicorn[standard]>=0.29
- pydantic>=2.6
- agno>=1.0
- google-genai>=1.0
- openai>=1.30

## Side Effects

Defined by owned components.

## Consumers

ClinicOS system composition and downstream project consumers.

## Invariants

Owned repository prefix: `clinicos-ai-runtime`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/requirements.txt`

## Related Knowledge

- `belongs-to` → `system.clinicos`
