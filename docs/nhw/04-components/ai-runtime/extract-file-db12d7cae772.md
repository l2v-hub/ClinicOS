---
id: 'component.ai-runtime.scripts-nhw-lib-python-extractor.py.extract-file'
kind: 'python-function'
title: 'extract_file'
status: 'observed'
summary: 'Public Python function from scripts/nhw/lib/python-extractor.py.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'scripts/nhw/lib/python-extractor.py'
    symbol: 'extract_file'
    line_start: '230'
    line_end: '319'
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

What does `component.ai-runtime.scripts-nhw-lib-python-extractor.py.extract-file` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.scripts-nhw-lib-python-extractor.py.extract-file is the canonical python-function named extract_file.

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

The public symbol name is `extract_file`.

## Failure Modes

None observed

## Evidence

- `scripts/nhw/lib/python-extractor.py:230-319` — extract_file

## Related Knowledge

- `belongs-to` → `project.repository-automation`
