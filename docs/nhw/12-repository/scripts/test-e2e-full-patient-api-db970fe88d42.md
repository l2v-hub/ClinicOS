---
id: "component.repository.package-script.package.json.test-e2e-full-patient-api"
kind: "package-script"
title: "clinicos:test:e2e:full-patient:api"
status: "observed"
summary: "Package script test:e2e:full-patient:api executes tsx scripts/e2e-full-patient-api-test.ts."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "test:e2e:full-patient:api"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "package.json"
    confidence: "observed"
tags:
  - "package-script"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.repository.package-script.package.json.test-e2e-full-patient-api` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.test-e2e-full-patient-api is the canonical package-script named clinicos:test:e2e:full-patient:api.

## Inputs

Command invocation: `test:e2e:full-patient:api`.

## Outputs

Executable command: `tsx scripts/e2e-full-patient-api-test.ts`.

## Dependencies

Package manifest: `package.json`.

## Side Effects

Defined by the invoked command and its subprocesses.

## Consumers

Developers, CI/CD workflows, deployment platforms, and autonomous agents.

## Invariants

The manifest command is authoritative for this script name.

## Failure Modes

Non-zero command exit, missing dependency, invalid configuration, or unavailable external service.

## Evidence

- `package.json` — test:e2e:full-patient:api

## Related Knowledge

- `belongs-to` → `project.repository-automation`
