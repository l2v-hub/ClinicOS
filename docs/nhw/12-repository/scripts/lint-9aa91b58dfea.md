---
id: "component.repository.package-script.backend.package.json.lint"
kind: "package-script"
title: "@clinicos/backend:lint"
status: "observed"
summary: "Package script lint executes eslint .."
bounded_contexts: []
sources:
  - path: "backend/package.json"
    symbol: "lint"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "backend/package.json"
    confidence: "observed"
tags:
  - "package-script"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.repository.package-script.backend.package.json.lint` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.backend.package.json.lint is the canonical package-script named @clinicos/backend:lint.

## Inputs

Command invocation: `lint`.

## Outputs

Executable command: `eslint .`.

## Dependencies

Package manifest: `backend/package.json`.

## Side Effects

Defined by the invoked command and its subprocesses.

## Consumers

Developers, CI/CD workflows, deployment platforms, and autonomous agents.

## Invariants

The manifest command is authoritative for this script name.

## Failure Modes

Non-zero command exit, missing dependency, invalid configuration, or unavailable external service.

## Evidence

- `backend/package.json` — lint

## Related Knowledge

- `belongs-to` → `project.repository-automation`
