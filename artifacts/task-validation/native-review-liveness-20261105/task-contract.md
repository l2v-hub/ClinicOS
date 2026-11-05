# Task Contract

## Task
- Title: Bound native review session lifecycle without weakening release gates
- Slug: native-review-liveness-20261105
- Type: bugfix
- Date: 2026-11-05

## Impact Classification
| Area | Impacted |
|---|---:|
| Frontend / Backend / Database | no |
| Native review transport / Security | yes |
| Workflow / Policy / Approval requirements | no |

## Current Behaviour
Native review run 41937588247 on trusted main b5e79ae7 exited 13 with unsettled top-level await and an empty receipt. The application review has no claim/report. Offline child processes reproduce this symptom with pending startup and pending cleanup; the exact hosted failure site and qualification inference outcome remain unknown.

## Expected Behaviour
Pending startup and cleanup terminate with bounded, sanitized failures, including when no unrelated event-loop handle remains. Concurrent close calls share cleanup, never report success before completion, never forward twice and never expand cleanup ownership. No qualification retry or live model invocation is authorized by these tests.

## Acceptance Criteria
- AC1: Real child-process regression fixtures without a parent keepalive reproduce both old failures and pass the correction with no network, Docker or credentials.
- AC2: Startup, isolation, release and cleanup remain bounded; cleanup rejection/timeout is explicit and cannot become approval or retry authority.
- AC3: Concurrent close callers share the same cleanup result; late startup cannot restore authority; cleanup affects only resources created by this invocation.
- AC4: Existing policy, source, native binary/image, output cap, one-forward and claim fencing tests pass unchanged in meaning.
- AC5: The patch and report disclose hosted qualification uncertainty and require the existing manual protected trust-root release path. No baseline service or controller history is changed.
- AC6: The already-fingerprinted container adapter must distinguish successful removal of its verified owned container ID from a failed, timed-out or unknown removal. No speculative name-based deletion; private directory retention and explicit failure on unknown cleanup. Include negative and positive mocked Docker-process outcomes without running Docker.

## Test Plan
| Test type | Required | Reason |
|---|---:|---|
| Unit / subprocess integration | yes | Native lifecycle and concurrency regression |
| Native guard regression suite | yes | Preserve trust, isolation and one-forward guards |
| Syntax and diff validation | yes | Artifact and source integrity |
| Live model/provider / application E2E | no | Repair qualification must follow protected review; no hosted inference retry |

## Evidence Plan
Sanitized TAP outputs, deterministic child exit codes and durations, independent read-only review, source-bound validation report. Never include tokens, raw model/network bodies or clinical data.

## Gate Status
READY FOR IMPLEMENTATION
