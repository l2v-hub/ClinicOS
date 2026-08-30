# Cycle 85 task contract — Atomic appointment authorization

## Problem

The shared UI/assistant appointment service checks ownership in a preliminary read, then previously updated or deleted by appointment ID alone. A concurrent administrator reassignment could let a stale ordinary-operator request mutate the newly reassigned appointment.

## Acceptance criteria

- Keep existing pre-read RBAC, destination-slot checks, and advisory locking.
- Repeat ordinary-operator ownership inside each update/delete mutation predicate.
- Keep admin and manager facility-wide behavior unchanged.
- Conditional update/delete failure must distinguish a concurrently removed appointment from a currently unauthorized appointment.
- Read the updated DTO inside the same transaction as the conditional update.
- Preserve slot-conflict behavior and the current response shapes/errors.
- Keep deletion UI-only; do not add any assistant delete capability.
- Add no schema migration, Entra dependency, extra unbounded query, or deployment change.
- Focused authorization tests, TypeScript build, lint, and independent reviews pass.
