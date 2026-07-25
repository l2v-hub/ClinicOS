---
id: "component.ai-runtime.scripts-nhw-lib-python-extractor.py.annotation-name"
kind: "python-function"
title: "annotation_name"
status: "observed"
summary: "Public Python function from scripts/nhw/lib/python-extractor.py."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "scripts/nhw/lib/python-extractor.py"
    symbol: "annotation_name"
    line_start: "119"
    line_end: "126"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.annotation-name` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.annotation-name is the canonical python-function named annotation_name.

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

The public symbol name is `annotation_name`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:119-126` — annotation_name

## Related Knowledge

- `belongs-to` → `project.repository-automation`
