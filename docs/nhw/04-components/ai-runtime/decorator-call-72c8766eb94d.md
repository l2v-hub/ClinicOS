---
id: "component.ai-runtime.scripts-nhw-lib-python-extractor.py.decorator-call"
kind: "python-function"
title: "decorator_call"
status: "observed"
summary: "Public Python function from scripts/nhw/lib/python-extractor.py."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/python-extractor.py"
    symbol: "decorator_call"
    line_start: "58"
    line_end: "59"
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

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.decorator-call` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.decorator-call is the canonical python-function named decorator_call.

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

The public symbol name is `decorator_call`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:58-59` — decorator_call

## Related Knowledge

- `belongs-to` → `project.repository-automation`
