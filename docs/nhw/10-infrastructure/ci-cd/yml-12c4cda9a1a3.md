---
id: 'component.repository.workflow.github.workflows.ai-runtime-tests.yml'
kind: 'ci-workflow'
title: 'AI Runtime Tests'
status: 'observed'
summary: 'GitHub Actions workflow with jobs test.'
bounded_contexts: []
sources:
  - path: '.github/workflows/ai-runtime-tests.yml'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: '.github/workflows/ai-runtime-tests.yml'
    confidence: 'observed'
tags:
  - 'github-actions'
  - 'ci-cd'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.repository.workflow.github.workflows.ai-runtime-tests.yml` represent in ClinicOS?

## Canonical Definition

component.repository.workflow.github.workflows.ai-runtime-tests.yml is the canonical ci-workflow named AI Runtime Tests.

## Inputs

Triggers: `["pull_request","push","workflow_dispatch"]`; secret names only: None observed.

## Outputs

Jobs: `["test"]`.

## Dependencies

None observed

## Side Effects

May build, test, migrate, publish, or deploy according to workflow jobs.

## Consumers

GitHub event processing and deployment governance.

## Invariants

Secret values are never represented; only referenced secret names are indexed.

## Failure Modes

Job command failure, missing secret, unavailable runner, failed check, or deployment error.

## Evidence

- `.github/workflows/ai-runtime-tests.yml`

## Related Knowledge

- `belongs-to` → `system.clinicos`
