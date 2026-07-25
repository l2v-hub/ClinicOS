---
id: 'component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-models.py.pagecontract'
kind: 'python-class'
title: 'PageContract'
status: 'observed'
summary: 'Public Python class from clinicos-ai-runtime/clinicos_ai/document_profiles/models.py.'
bounded_contexts:
  - 'context.clinical-record'
sources:
  - path: 'clinicos-ai-runtime/clinicos_ai/document_profiles/models.py'
    symbol: 'PageContract'
    line_start: '68'
    line_end: '94'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.clinicos-ai-runtime'
    evidence: 'clinicos-ai-runtime/clinicos_ai/document_profiles/models.py'
    confidence: 'observed'
tags:
  - 'python'
  - 'class'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-models.py.pagecontract` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-models.py.pagecontract is the canonical python-class named PageContract.

## Inputs

Defined by the Python signature at the cited source span.

## Outputs

Defined by return annotations and implementation.

## Dependencies

Owning project: `project.clinicos-ai-runtime`.

## Side Effects

None observed

## Consumers

Import consumers are resolved through the source graph.

## Invariants

The public symbol name is `PageContract`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/document_profiles/models.py:68-94` — PageContract

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
