---
id: "component.repository.workflow.github.workflows.frontend-secret-scan.yml"
kind: "ci-workflow"
title: "Frontend Secret Scan"
status: "observed"
summary: "GitHub Actions workflow with jobs secret-scan."
bounded_contexts: []
sources:
  - path: ".github/workflows/frontend-secret-scan.yml"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".github/workflows/frontend-secret-scan.yml"
    confidence: "observed"
tags:
  - "github-actions"
  - "ci-cd"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.repository.workflow.github.workflows.frontend-secret-scan.yml` represent in ClinicOS?

## Canonical Definition

component.repository.workflow.github.workflows.frontend-secret-scan.yml is the canonical ci-workflow named Frontend Secret Scan.

## Inputs

Triggers: `["pull_request","push","workflow_dispatch"]`; secret names only: None observed.

## Outputs

Jobs: `["secret-scan"]`.

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

- `.github/workflows/frontend-secret-scan.yml`

## Related Knowledge

- `belongs-to` → `system.clinicos`
