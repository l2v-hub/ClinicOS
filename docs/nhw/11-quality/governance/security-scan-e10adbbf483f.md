---
id: "test.governance.security-scan"
kind: "security-gate"
title: "Frontend secret scan"
status: "observed"
summary: "Repository security gate rejects credential-like values and secret-like VITE variable names in frontend source and bundles."
bounded_contexts: []
sources:
  - path: "scripts/security/scan-frontend-secrets.mjs"
    confidence: "observed"
  - path: "package.json"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.delivery-quality-governance"
    evidence: "scripts/security/scan-frontend-secrets.mjs,package.json"
    confidence: "observed"
tags:
  - "security-gate"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `test.governance.security-scan` represent in ClinicOS?

## Canonical Definition

test.governance.security-scan is the canonical security-gate named Frontend secret scan.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Repository security gate rejects credential-like values and secret-like VITE variable names in frontend source and bundles.

## Dependencies

Owning knowledge target: `context.delivery-quality-governance`.

## Side Effects

Fails the command when a credential exposure pattern is detected.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `scripts/security/scan-frontend-secrets.mjs`
- `package.json`

## Related Knowledge

- `belongs-to` → `context.delivery-quality-governance`
