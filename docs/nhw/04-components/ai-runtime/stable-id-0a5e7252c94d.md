---
id: 'component.ai-runtime.scripts-nhw-lib-python-extractor.py.stable-id'
kind: 'python-function'
title: 'stable_id'
status: 'observed'
summary: 'Public Python function from scripts/nhw/lib/python-extractor.py.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'scripts/nhw/lib/python-extractor.py'
    symbol: 'stable_id'
    line_start: '18'
    line_end: '23'
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

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.stable-id` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.stable-id is the canonical python-function named stable_id.

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

The public symbol name is `stable_id`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:18-23` — stable_id

## Related Knowledge

- `belongs-to` → `project.repository-automation`
