---
id: "component.ai-runtime.scripts-nhw-lib-python-extractor.py.base-names"
kind: "python-function"
title: "base_names"
status: "observed"
summary: "Public Python function from scripts/nhw/lib/python-extractor.py."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/python-extractor.py"
    symbol: "base_names"
    line_start: "94"
    line_end: "95"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/python-extractor.py"
    confidence: "observed"
tags:
  - "python"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.base-names` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.base-names is the canonical python-function named base_names.

## Inputs

Defined by the Python signature at the cited source span.

## Outputs

Defined by return annotations and implementation.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

Import consumers are resolved through the source graph.

## Invariants

The public symbol name is `base_names`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:94-95` — base_names

## Related Knowledge

- `belongs-to` → `project.repository-automation`
