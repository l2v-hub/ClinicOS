---
id: "component.ai-runtime.scripts-nhw-lib-python-extractor.py.lifecycle-decorator"
kind: "python-function"
title: "lifecycle_decorator"
status: "observed"
summary: "Public Python function from scripts/nhw/lib/python-extractor.py."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/python-extractor.py"
    symbol: "lifecycle_decorator"
    line_start: "82"
    line_end: "91"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.lifecycle-decorator` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.lifecycle-decorator is the canonical python-function named lifecycle_decorator.

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

The public symbol name is `lifecycle_decorator`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:82-91` — lifecycle_decorator

## Related Knowledge

- `belongs-to` → `project.repository-automation`
