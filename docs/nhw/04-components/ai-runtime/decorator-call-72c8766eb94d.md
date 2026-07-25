---
id: 'component.ai-runtime.scripts-nhw-lib-python-extractor.py.decorator-call'
kind: 'python-function'
title: 'decorator_call'
status: 'observed'
summary: 'Public Python function from scripts/nhw/lib/python-extractor.py.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'scripts/nhw/lib/python-extractor.py'
    symbol: 'decorator_call'
    line_start: '58'
    line_end: '59'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.repository-automation'
    evidence: 'scripts/nhw/lib/python-extractor.py'
    confidence: 'observed'
tags:
  - 'python'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
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
