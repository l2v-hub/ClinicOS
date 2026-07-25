---
id: "component.ai-runtime.scripts-nhw-lib-python-extractor.py.expression-name"
kind: "python-function"
title: "expression_name"
status: "observed"
summary: "Public Python function from scripts/nhw/lib/python-extractor.py."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/python-extractor.py"
    symbol: "expression_name"
    line_start: "26"
    line_end: "39"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.expression-name` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.expression-name is the canonical python-function named expression_name.

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

The public symbol name is `expression_name`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:26-39` — expression_name

## Related Knowledge

- `belongs-to` → `project.repository-automation`
