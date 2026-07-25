---
id: "component.ai-runtime.scripts-nhw-lib-python-extractor.py.route-decorator"
kind: "python-function"
title: "route_decorator"
status: "observed"
summary: "Public Python function from scripts/nhw/lib/python-extractor.py."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/python-extractor.py"
    symbol: "route_decorator"
    line_start: "62"
    line_end: "79"
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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.route-decorator` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.route-decorator is the canonical python-function named route_decorator.

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

The public symbol name is `route_decorator`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:62-79` — route_decorator

## Related Knowledge

- `belongs-to` → `project.repository-automation`
