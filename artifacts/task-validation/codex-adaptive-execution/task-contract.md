# Task Contract

## Task

Adaptive implementation model selection, updating PR #471. Date: 2026-10-16. Baseline: 7c6a482a.

## Impact Classification

Orchestration, model routing, configuration and documentation only. No application, database or production changes.

## Current Behaviour

Every implementation and simplification session defaults to Luna. The analyst can be configured separately but cannot choose direct senior execution per group based on difficulty or actual local load.

## Expected Behaviour

Automatic selection is the default. The Codex plan assesses difficulty and delegation suitability for each group. Complex/risky groups, direct execution requests and escalated attempts use the analyst model (default gpt-6.1-sol). Bounded simpler work may use a configurable delegate, currently gpt-6-luna. Active local sessions and explicit provider capacity/rate-limit errors influence subsequent selection; remote global capacity is not invented. A fixed executor override allows gpt-6.1-sol for every implementation session. Independent QA sessions and Claude review remain separate roles, even when the same Codex model implements and verifies. Existing persisted plans remain readable and conservatively use direct senior execution.

## Acceptance Criteria

- AC1: New plans contain validated difficulty, direct/delegate choice and rationale. Older frozen plans retain their bytes and counters and default conservatively to senior execution.
- AC2: Auto routing selects senior for complex/direct work and delegates only suitable tasks. Actual local in-flight load and known capacity errors can route work to senior, without extra retries or changing four-attempt budgets.
- AC3: Fixed executor configuration, including gpt-6.1-sol, overrides automatic selection. Simplification follows the selected executor and routing decisions are recorded in the batch evidence.
- AC4: Skills, guide, workflow and cloud draft describe adaptive selection, with auto default. Tests cover senior-only execution, delegation, concurrency/load, capacity escalation and legacy state. Independent QA reviews the scoped diff before publication.

## Test Plan

Meaningful Node tests with deterministic CLI adapters, concurrent deferred sessions and real fixture files; existing pipeline/Claude review regression suite. No paid model invocation or live issue processing. Independent QA per repository skill, including applicable build/security/evidence checks; existing app build evidence remains valid when application source is unchanged.

## Evidence Plan

Sanitized test logs, routing decisions, independent QA and exact source hashes under this packet. Update existing PR #471 without merge or production deployment. Preserve unrelated cleanup SQL.

## Gate Status

READY FOR IMPLEMENTATION
