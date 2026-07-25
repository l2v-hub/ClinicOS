---
id: "component.ai-runtime.clinicos-ai-runtime-tools-req025-demo.py.show"
kind: "python-function"
title: "show"
status: "observed"
summary: "Public Python function from clinicos-ai-runtime/tools/req025_demo.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/tools/req025_demo.py"
    symbol: "show"
    line_start: "21"
    line_end: "22"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/tools/req025_demo.py"
    confidence: "observed"
tags:
  - "python"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-tools-req025-demo.py.show` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-tools-req025-demo.py.show is the canonical python-function named show.

## Inputs

Defined by the Python signature at the cited source span.

## Outputs

Defined by return annotations and implementation.

## Dependencies

Owning project: `project.clinicos-ai-runtime`.

## Side Effects

None observed

## Consumers

Import consumers are resolved through the source graph.

## Invariants

The public symbol name is `show`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/tools/req025_demo.py:21-22` — show

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
