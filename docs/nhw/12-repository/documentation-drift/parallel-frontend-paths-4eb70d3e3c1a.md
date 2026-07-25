---
id: "finding.deployment.parallel-frontend-paths"
kind: "architectural-finding"
title: "Parallel Vercel and Azure Static Web Apps paths"
status: "inferred"
summary: "Vercel configuration and an Azure Static Web Apps workflow coexist as frontend delivery paths."
bounded_contexts: []
sources:
  - path: "frontend/vercel.json"
    confidence: "inferred"
  - path: ".github/workflows/azure-static-web-apps-orange-hill-02285750f.yml"
    confidence: "inferred"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/vercel.json,.github/workflows/azure-static-web-apps-orange-hill-02285750f.yml"
    confidence: "inferred"
tags:
  - "architectural-finding"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
inference_rule: "Both executable deployment configurations remain present in the current working tree."
---

## Question Answered

What does `finding.deployment.parallel-frontend-paths` represent in ClinicOS?

## Canonical Definition

finding.deployment.parallel-frontend-paths is the canonical architectural-finding named Parallel Vercel and Azure Static Web Apps paths.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Vercel configuration and an Azure Static Web Apps workflow coexist as frontend delivery paths.

## Dependencies

Owning knowledge target: `project.frontend`.

## Side Effects

Delivery changes may need coordination across two executable frontend deployment paths.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `frontend/vercel.json`
- `.github/workflows/azure-static-web-apps-orange-hill-02285750f.yml`

## Related Knowledge

- `belongs-to` → `project.frontend`
