# NHW Knowledge Base Validation Report

## Baseline

- Repository: `ClinicOS`
- Branch: `fix/import-azure-gpt55-swap`
- Generation base commit: `92d8a4735563a235e62079fc53484dfca57700cb`
- Source inventory hash: `57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c`
- Baseline type: current working tree, including tracked and untracked repository paths
- Generated-output exclusions: `docs/nhw/catalog`, `docs/nhw/coverage`,
  `docs/nhw/evidence`, `docs/nhw/graph`, and `docs/nhw/reports`

## Validation Result

- Result: `CLOSED — VERIFIED`
- Validator errors: `0`
- Validator warnings: `0`
- Required unresolved discoveries: `0`
- Graph orphans: `0`
- Secret-like values in generated knowledge artifacts: `0`

## Corpus Totals

| Measure                             | Count |
| ----------------------------------- | ----: |
| Repository inventory paths          | 6,181 |
| Atomic knowledge units              | 2,622 |
| Semantic discoveries                | 1,539 |
| Documented coverage records         | 3,926 |
| Metadata-only coverage records      | 1,470 |
| Generated/excluded coverage records |   785 |
| Graph nodes                         | 2,622 |
| Graph edges                         | 3,091 |
| Classified cycles                   |    31 |
| Express endpoints                   |   114 |
| FastAPI endpoints                   |    12 |
| Public components                   | 1,038 |
| Domain entities                     |    25 |
| Prisma models                       |    25 |
| Migrations                          |    23 |
| Configuration keys                  |    79 |
| Runtime flows                       |    16 |
| Test surfaces                       |   184 |
| Findings                            |     9 |

## Coverage Invariants

- Path classification coverage:
  `(3,926 documented + 1,470 metadata-only + 785 generated/excluded) / 6,181 = 100%`.
- Required semantic discovery coverage:
  `1,539 resolved / 1,539 discovered = 100%`.
- Entity/model parity: `25 domain entities / 25 Prisma models = 100%`.
- API coverage: `126 endpoint units / 126 discovered endpoints = 100%`.
- Graph closure: `0` missing edge targets and `0` orphan nodes.
- Evidence closure: every source-bearing knowledge unit has a source-map record
  with a SHA-256 file hash and line span.

## Cycle Classification

- `24` cycles are `acceptable-mutual-schema-relation`; they are caused by
  bidirectional Prisma relations.
- `7` cycles are `expected-system-containment`; they connect the system node
  with its seven project nodes.
- `0` cycles are unclassified.

## Canonical Findings

- `finding.abstraction.exported-symbols-without-observed-consumers`
- `finding.coupling.express-route-direct-prisma-access`
- `finding.coupling.patient-document-route-order`
- `finding.coupling.unmounted-express-router`
- `finding.cycle.prisma-bidirectional-relations`
- `finding.deployment.parallel-frontend-paths`
- `finding.drift.readme-backend-port`
- `finding.extension.provider-registry`
- `finding.state.fastapi-process-local-jobs`

The finding units are observations and extension points; they are not
unresolved NHW coverage records.

## Verification Evidence

| Check                |                           Result | Evidence                                                                                   |
| -------------------- | -------------------------------: | ------------------------------------------------------------------------------------------ |
| NHW tests            |                      PASS, 35/35 | `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/nhw-tests.txt`         |
| NHW validation       |                   PASS, 0 errors | `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/nhw-validation.txt`    |
| Deterministic rerun  | PASS, 2,648 files byte-identical | `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/determinism.txt`       |
| Backend tests        |                    PASS, 376/376 | `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/application-tests.txt` |
| Frontend tests       |                      PASS, 98/98 | `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/application-tests.txt` |
| Agent-team tests     |                    PASS, 108/108 | `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/agent-team-tests.txt`  |
| AI runtime tests     |                      PASS, 78/78 | `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/ai-runtime-tests.txt`  |
| Production build     |                             PASS | `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/build.txt`             |
| Frontend secret scan |                 PASS, 0 findings | `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/security-scan.txt`     |

## Residual Risks

- The frontend production build reports a pre-existing CSS import-order
  warning for `clinicos-restyle.css`.
- The frontend production build reports a main bundle larger than 500 kB.
- The local Node.js 20 runtime is accepted by the repository but some installed
  tool versions advertise Node.js 22 as their preferred engine.
- Dependency audit debt observed during installation remains outside this
  documentation-only task.

These risks do not invalidate the NHW corpus, but they remain independently
retrievable operational debt.
