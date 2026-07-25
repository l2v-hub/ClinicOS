---
id: "component.repository.workflow.github.workflows.activate-assistant-llm.yml"
kind: "ci-workflow"
title: "Activate Assistant LLM (backend flags)"
status: "observed"
summary: "GitHub Actions workflow with jobs activate."
bounded_contexts: []
sources:
  - path: ".github/workflows/activate-assistant-llm.yml"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".github/workflows/activate-assistant-llm.yml"
    confidence: "observed"
tags:
  - "github-actions"
  - "ci-cd"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.repository.workflow.github.workflows.activate-assistant-llm.yml` represent in ClinicOS?

## Canonical Definition

component.repository.workflow.github.workflows.activate-assistant-llm.yml is the canonical ci-workflow named Activate Assistant LLM (backend flags).

## Inputs

Triggers: `["workflow_dispatch"]`; secret names only: `["RAILWAY_TOKEN"]`.

## Outputs

Jobs: `["activate"]`.

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

- `.github/workflows/activate-assistant-llm.yml`

## Related Knowledge

- `belongs-to` → `system.clinicos`
