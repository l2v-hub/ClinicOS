# Task Contract

## Task
- Title: ClinicOS NHW knowledge base
- Slug: clinicos-nhw-knowledge-base
- Type: refactor
- Date: 2026-07-25

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | yes |

## Current Behaviour

ClinicOS has requirements, specifications, tests, runtime code, deployment
configuration, and QA evidence, but it has no deterministic machine-oriented
knowledge base that reconciles these sources into stable concepts, typed
dependencies, source evidence, and measurable repository coverage.

## Expected Behaviour

The repository exposes a deterministic NHW knowledge base under `docs/nhw/`
with atomic Markdown units, machine-readable catalogs, a typed graph, source
evidence, coverage ledgers, and fail-closed validation. Generation does not
modify application behavior or publish secret values.

## Acceptance Criteria

- AC1: Every repository path is classified in the NHW coverage ledger.
- AC2: Every discovered public component, endpoint, model, migration,
  configuration read, test surface, composition root, and important workflow is
  documented or explicitly excluded with evidence.
- AC3: The NHW test suite, validator, secret scan, and deterministic rerun all
  pass without modifying application source.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Extractor, parser, graph, and validator contracts |
| Integration | yes | End-to-end generation and coverage reconciliation |
| API | no | |
| Playwright | no | |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Reject secret-like values in generated artifacts |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- deterministic rerun hash comparison
- NHW coverage and validation reports
- frontend secret-scan output

## Risks

- Risk: current untracked artifacts are lost from analysis. Mitigation: inventory
  the current working tree directly instead of a clean linked worktree.
- Risk: narrative documentation overrides executable behavior. Mitigation:
  enforce source precedence and record drift.
- Risk: secrets leak from environment files. Mitigation: capture variable names
  and consumers only, then run the secret-like value scanner.
- Risk: generated output becomes stale or non-deterministic. Mitigation: bind
  artifacts to the inventory hash and require a byte-stable rerun.

## Gate Status

READY FOR IMPLEMENTATION
