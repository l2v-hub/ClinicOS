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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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
