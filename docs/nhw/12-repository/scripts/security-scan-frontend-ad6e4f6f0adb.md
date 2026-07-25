---
id: "component.repository.package-script.package.json.security-scan-frontend"
kind: "package-script"
title: "clinicos:security:scan-frontend"
status: "observed"
summary: "Package script security:scan-frontend executes node scripts/security/scan-frontend-secrets.mjs frontend/src frontend/index.html."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "security:scan-frontend"
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

What does `component.repository.package-script.package.json.security-scan-frontend` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.security-scan-frontend is the canonical package-script named clinicos:security:scan-frontend.

## Inputs

Command invocation: `security:scan-frontend`.

## Outputs

Executable command: `node scripts/security/scan-frontend-secrets.mjs frontend/src frontend/index.html`.

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

- `package.json` — security:scan-frontend

## Related Knowledge

- `belongs-to` → `project.repository-automation`
