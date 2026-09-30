# Phase 1 — Current State

- Phase: 1 — Capability Catalog, Tool Layer & Invocability
- Status: see `../CURRENT_STATE.json` (`phase_status`)
- Date: 2026-09-30
- Worktree / branch: `C:/Workspace/ClinicOSHouse-worktrees/capability-layer` · `feat/capability-tool-layer` (from `origin/main` 76ac4c60) — not committed, not pushed, not deployed.
- Quality gate: `artifacts/task-validation/phase-1-capability-catalog-and-tool-layer/`

## Artifacts

| File                          | Purpose                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `CAPABILITY_CATALOG.json`     | catalog of record (200 capabilities, schema `clinicos.capability-catalog/v1`) |
| `CAPABILITY_CATALOG.md`       | generated view (`node scripts/ai-architecture/render-capability-catalog.mjs`) |
| `TOOL_LAYER_ASSESSMENT.md`    | state before Phase 1                                                          |
| `TARGET_TOOL_ARCHITECTURE.md` | Tool Layer contract (naming, schema, errors, hooks, identity, idempotency)    |
| `REGRESSION_BASELINE.md`      | test baseline vs after, flaky analysis                                        |
| `MIGRATION_PLAN.md`           | what changed (incl. local refactors) and next steps                           |
| `PROMPT2_HANDOFF.md`          | input for Prompt 2                                                            |

## Numbers

- Capabilities 200 — READY 95 · WRAP 49 · GAP 56.
- Exposure — TOOL 56 · AGNOS_INTERNAL 23 · GUI_ONLY 9 · NOT_EXPOSED 105 · DEPRECATED 5 · DEV_ONLY 2.
- Invocability — TESTED 67 (56 tools + 11 Agnos read tools via existing/new tests) · EXPOSED 12 (Agnos, no direct evidence) · DISCOVERED 121.
- Failed tool tests: 0. GUI-parity-verified capabilities: 45.

## Code

- `backend/src/tools/` — types, errors, hooks, registry, http, index, `capabilities/*` (12 domain files), `__tests__/*` (13 files).
- Local refactors (verbatim moves): `therapies/administration-record.ts`, `patients/diary-write-service.ts`, `patients/diary-author.ts`, `ai/ownership.ts#loadIntakeDraftOwner`, exports in `routes/patient-documents.ts`, `routes/therapy.ts#therapySlotPatientAccess`.
- `app.ts`: mounts `/tools`. `ai/audit-store.ts`: channel type union widened (no migration).
