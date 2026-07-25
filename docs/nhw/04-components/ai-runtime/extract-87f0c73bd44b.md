---
id: "component.ai-runtime.scripts-nhw-lib-python-extractor.py.extract"
kind: "python-function"
title: "extract"
status: "observed"
summary: "Public Python function from scripts/nhw/lib/python-extractor.py."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/python-extractor.py"
    symbol: "extract"
    line_start: "322"
    line_end: "354"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.extract` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.extract is the canonical python-function named extract.

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

The public symbol name is `extract`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:322-354` — extract

## Related Knowledge

- `belongs-to` → `project.repository-automation`
