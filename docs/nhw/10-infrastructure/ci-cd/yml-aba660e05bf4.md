---
id: "component.repository.workflow.github.workflows.set-runtime-model.yml"
kind: "ci-workflow"
title: "Set Runtime Agent Model"
status: "observed"
summary: "GitHub Actions workflow with jobs set-and-deploy."
bounded_contexts: []
sources:
  - path: ".github/workflows/set-runtime-model.yml"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".github/workflows/set-runtime-model.yml"
    confidence: "observed"
tags:
  - "github-actions"
  - "ci-cd"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.repository.workflow.github.workflows.set-runtime-model.yml` represent in ClinicOS?

## Canonical Definition

component.repository.workflow.github.workflows.set-runtime-model.yml is the canonical ci-workflow named Set Runtime Agent Model.

## Inputs

Triggers: `["workflow_dispatch"]`; secret names only: `["RAILWAY_TOKEN"]`.

## Outputs

Jobs: `["set-and-deploy"]`.

## Dependencies

- `npm install -g @railway/cli`

## Side Effects

May build, test, migrate, publish, or deploy according to workflow jobs.

## Consumers

GitHub event processing and deployment governance.

## Invariants

Secret values are never represented; only referenced secret names are indexed.

## Failure Modes

Job command failure, missing secret, unavailable runner, failed check, or deployment error.

## Evidence

- `.github/workflows/set-runtime-model.yml`

## Related Knowledge

- `belongs-to` → `system.clinicos`
