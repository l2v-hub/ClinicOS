---
id: "component.repository.package-script.backend.package.json.dev"
kind: "package-script"
title: "@clinicos/backend:dev"
status: "observed"
summary: "Package script dev executes tsx watch src/server.ts."
bounded_contexts: []
sources:
  - path: "backend/package.json"
    symbol: "dev"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.repository.package-script.backend.package.json.dev` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.backend.package.json.dev is the canonical package-script named @clinicos/backend:dev.

## Inputs

Command invocation: `dev`.

## Outputs

Executable command: `tsx watch src/server.ts`.

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

- `backend/package.json` — dev

## Related Knowledge

- `belongs-to` → `project.repository-automation`
