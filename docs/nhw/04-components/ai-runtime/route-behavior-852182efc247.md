---
id: "component.ai-runtime.scripts-nhw-lib-python-extractor.py.route-behavior"
kind: "python-function"
title: "route_behavior"
status: "observed"
summary: "Public Python function from scripts/nhw/lib/python-extractor.py."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/python-extractor.py"
    symbol: "route_behavior"
    line_start: "129"
    line_end: "177"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.route-behavior` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.route-behavior is the canonical python-function named route_behavior.

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

The public symbol name is `route_behavior`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:129-177` — route_behavior

## Related Knowledge

- `belongs-to` → `project.repository-automation`
