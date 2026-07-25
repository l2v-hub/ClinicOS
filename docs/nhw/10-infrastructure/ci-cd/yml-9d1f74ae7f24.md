---
id: "component.repository.workflow.github.workflows.azure-static-web-apps-orange-hill-02285750f.yml"
kind: "ci-workflow"
title: "Azure Static Web Apps CI/CD"
status: "observed"
summary: "GitHub Actions workflow with jobs build_and_deploy_job, close_pull_request_job."
bounded_contexts: []
sources:
  - path: ".github/workflows/azure-static-web-apps-orange-hill-02285750f.yml"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".github/workflows/azure-static-web-apps-orange-hill-02285750f.yml"
    confidence: "observed"
tags:
  - "github-actions"
  - "ci-cd"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.repository.workflow.github.workflows.azure-static-web-apps-orange-hill-02285750f.yml` represent in ClinicOS?

## Canonical Definition

component.repository.workflow.github.workflows.azure-static-web-apps-orange-hill-02285750f.yml is the canonical ci-workflow named Azure Static Web Apps CI/CD.

## Inputs

Triggers: `["pull_request","push"]`; secret names only: `["AZURE_STATIC_WEB_APPS_API_TOKEN_ORANGE_HILL_02285750F","GITHUB_TOKEN"]`.

## Outputs

Jobs: `["build_and_deploy_job","close_pull_request_job"]`.

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

- `.github/workflows/azure-static-web-apps-orange-hill-02285750f.yml`

## Related Knowledge

- `belongs-to` → `system.clinicos`
