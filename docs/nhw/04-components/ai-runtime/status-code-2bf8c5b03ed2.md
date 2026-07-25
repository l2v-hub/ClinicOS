---
id: "component.ai-runtime.scripts-nhw-lib-python-extractor.py.status-code"
kind: "python-function"
title: "status_code"
status: "observed"
summary: "Public Python function from scripts/nhw/lib/python-extractor.py."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/python-extractor.py"
    symbol: "status_code"
    line_start: "48"
    line_end: "55"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.status-code` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.status-code is the canonical python-function named status_code.

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

The public symbol name is `status_code`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:48-55` — status_code

## Related Knowledge

- `belongs-to` → `project.repository-automation`
