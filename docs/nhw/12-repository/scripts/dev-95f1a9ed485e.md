---
id: "component.repository.package-script.frontend.package.json.dev"
kind: "package-script"
title: "frontend:dev"
status: "observed"
summary: "Package script dev executes vite."
bounded_contexts: []
sources:
  - path: "frontend/package.json"
    symbol: "dev"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "frontend/package.json"
    confidence: "observed"
tags:
  - "package-script"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.repository.package-script.frontend.package.json.dev` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.frontend.package.json.dev is the canonical package-script named frontend:dev.

## Inputs

Command invocation: `dev`.

## Outputs

Executable command: `vite`.

## Dependencies

Package manifest: `frontend/package.json`.

## Side Effects

Defined by the invoked command and its subprocesses.

## Consumers

Developers, CI/CD workflows, deployment platforms, and autonomous agents.

## Invariants

The manifest command is authoritative for this script name.

## Failure Modes

Non-zero command exit, missing dependency, invalid configuration, or unavailable external service.

## Evidence

- `frontend/package.json` — dev

## Related Knowledge

- `belongs-to` → `project.repository-automation`
