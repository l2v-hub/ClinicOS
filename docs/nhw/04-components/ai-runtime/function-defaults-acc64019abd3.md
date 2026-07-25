---
id: "component.ai-runtime.scripts-nhw-lib-python-extractor.py.function-defaults"
kind: "python-function"
title: "function_defaults"
status: "observed"
summary: "Public Python function from scripts/nhw/lib/python-extractor.py."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/python-extractor.py"
    symbol: "function_defaults"
    line_start: "107"
    line_end: "116"
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

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.function-defaults` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.function-defaults is the canonical python-function named function_defaults.

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

The public symbol name is `function_defaults`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:107-116` — function_defaults

## Related Knowledge

- `belongs-to` → `project.repository-automation`
