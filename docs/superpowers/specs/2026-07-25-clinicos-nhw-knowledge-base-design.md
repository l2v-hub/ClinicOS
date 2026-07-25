# ClinicOS NHW Knowledge Base Design

## 1. Purpose

This specification defines the permanent machine-oriented knowledge base for the
ClinicOS repository under the No Human Welcome initiative.

The knowledge base MUST let a future autonomous agent answer architectural,
domain, runtime, API, persistence, configuration, infrastructure, quality, and
business-process questions without rediscovering the repository from scratch.

The target repository is the current ClinicOS working tree. Its implemented
stack is:

- React, TypeScript, and Vite for the browser application.
- Express and TypeScript for the primary HTTP API.
- Prisma and PostgreSQL for persistence.
- FastAPI, Python, Agno, and model-provider adapters for the AI runtime.
- Node.js scripts for quality gates, agent-team orchestration, test execution,
  deployment support, and governance automation.
- GitHub Actions, Railway, Vercel, Docker Compose, PowerShell, and shell scripts
  for delivery and operations.

The analysis is language-independent. The original C# wording does not restrict
the operational scope.

## 2. Design Decision

ClinicOS will use a dual representation:

1. Atomic Markdown knowledge units optimized for semantic retrieval and
   self-contained reasoning.
2. Canonical machine-readable catalogs and typed graph edges optimized for
   traversal, coverage verification, and automation.

Neither representation replaces the other:

- Markdown owns explanations, invariants, workflows, and evidence interpretation.
- JSON and JSONL own identity, indexing, graph topology, source mapping, and
  coverage accounting.

Generated views MUST reference canonical identifiers instead of copying
authoritative explanations.

## 3. Source-of-Truth Precedence

When sources disagree, the extractor and curator MUST use this precedence:

1. Runtime composition roots and executable code.
2. Database schema, migrations, constraints, and seed behavior.
3. Automated tests and objective runtime evidence.
4. Build, deployment, CI/CD, and environment configuration.
5. Requirements, specifications, and governance contracts.
6. Narrative documentation and historical reports.

A lower-precedence source that conflicts with a higher-precedence source MUST be
recorded as documentation drift. It MUST NOT silently override observed runtime
behavior.

Every non-trivial claim MUST have at least one source reference. Inferred claims
MUST be marked `inferred` and state the inference rule.

## 4. Repository State Model

The first baseline describes the complete current working tree, including
tracked modifications and untracked source or test files present during
extraction.

The baseline metadata MUST record:

- repository root;
- current branch;
- HEAD commit;
- tracked modification paths;
- untracked paths included in analysis;
- extraction tool version;
- source inventory hash;
- knowledge-base schema version.

Existing user changes MUST remain untouched. Generated NHW artifacts MUST live
only under `docs/nhw/`, `scripts/nhw/`, and the NHW task-validation directory.

Secret values MUST never be copied into knowledge artifacts. Environment files
are analyzed only for variable names, source category, consumers, requirement
status, and security classification.

## 5. Stable Identity Model

Every knowledge object MUST have one globally unique, lowercase,
dot-separated identifier.

Identifier families:

| Kind                  | Identifier pattern                | Example                                              |
| --------------------- | --------------------------------- | ---------------------------------------------------- |
| System                | `system.<name>`                   | `system.clinicos`                                    |
| Project               | `project.<name>`                  | `project.backend`                                    |
| Bounded context       | `context.<name>`                  | `context.patient-record`                             |
| Domain entity         | `entity.<name>`                   | `entity.patient`                                     |
| Value object          | `value.<name>`                    | `value.therapy-schedule`                             |
| Component             | `component.<project>.<name>`      | `component.backend.entra-auth`                       |
| API endpoint          | `api.<project>.<operation>`       | `api.backend.patient-create`                         |
| Data model            | `data.model.<name>`               | `data.model.patient`                                 |
| Migration             | `data.migration.<timestamp-name>` | `data.migration.20260721090000-user-entra-object-id` |
| Runtime flow          | `flow.<name>`                     | `flow.patient-intake`                                |
| Configuration key     | `config.<scope>.<name>`           | `config.backend.database-url`                        |
| External integration  | `integration.<name>`              | `integration.azure-entra-id`                         |
| Test surface          | `test.<scope>.<name>`             | `test.backend.entra-auth`                            |
| Architectural finding | `finding.<category>.<name>`       | `finding.drift.readme-backend-port`                  |

Identifiers MUST remain stable when files move. A renamed concept receives a new
identifier only when its meaning changes. Redirect records preserve previous
identifiers.

## 6. Knowledge Unit Contract

Every Markdown unit MUST begin with deterministic YAML frontmatter containing:

```yaml
id: entity.patient
kind: domain-entity
title: Patient
status: observed
summary: Canonical clinical subject managed by ClinicOS.
bounded_contexts:
  - context.patient-record
sources:
  - path: prisma/schema.prisma
    symbol: Patient
relations:
  - type: persisted-as
    target: data.model.patient
tags:
  - patient
  - clinical-record
last_verified:
  commit: repository-head-or-working-tree
  inventory_hash: sha256
```

Allowed status values:

- `observed`: directly supported by executable sources.
- `inferred`: reconstructed from multiple observed sources.
- `declared`: present only in a requirement, specification, or narrative source.
- `drifted`: declared behavior conflicts with executable behavior.
- `deprecated`: retained for compatibility or historical navigation.

Every unit body MUST contain these headings:

1. `Question Answered`
2. `Canonical Definition`
3. `Inputs`
4. `Outputs`
5. `Dependencies`
6. `Side Effects`
7. `Consumers`
8. `Invariants`
9. `Failure Modes`
10. `Evidence`
11. `Related Knowledge`

A kind-specific unit MAY add headings, but MUST NOT remove the common headings.
`None observed` is the explicit value when a heading has no applicable facts.

## 7. Artifact Layout

```text
docs/nhw/
  README.md
  00-contract/
    ontology.md
    source-precedence.md
    retrieval-contract.md
    exclusions.md
  01-system/
    system-overview.md
    project-catalog.md
    startup-topology.md
    lifecycle.md
    cross-cutting-concerns.md
  02-contexts/
    <bounded-context-id>.md
  03-domain/
    entities/<entity-id>.md
    value-objects/<value-id>.md
    business-rules/<rule-id>.md
  04-components/
    backend/<component-id>.md
    frontend/<component-id>.md
    ai-runtime/<component-id>.md
    agent-team/<component-id>.md
    shared/<component-id>.md
  05-runtime/
    startup/<runtime-id>.md
    middleware/<middleware-id>.md
    jobs/<job-id>.md
    authentication/<auth-id>.md
    error-handling/<error-id>.md
    observability/<observability-id>.md
  06-api/
    endpoints/<endpoint-id>.md
    models/<api-model-id>.md
    permissions/<permission-id>.md
  07-data/
    models/<model-id>.md
    migrations/<migration-id>.md
    indexes/<index-id>.md
    raw-sql/<usage-id>.md
  08-flows/
    <flow-id>.md
  09-configuration/
    sources/<source-id>.md
    keys/<configuration-key-id>.md
    environments/<environment-id>.md
  10-infrastructure/
    containers/<container-id>.md
    ci-cd/<pipeline-id>.md
    deployments/<deployment-id>.md
    external-integrations/<integration-id>.md
  11-quality/
    tests/<test-surface-id>.md
    governance/<governance-id>.md
    findings/<finding-id>.md
  12-repository/
    scripts/<script-id>.md
    documentation-drift/<drift-id>.md
    artifact-inventory/<artifact-id>.md
  catalog/
    manifest.json
    redirects.json
  graph/
    nodes.jsonl
    edges.jsonl
  evidence/
    source-map.jsonl
  coverage/
    ledger.json
    exclusions.json
  schemas/
    manifest.schema.json
    graph-node.schema.json
    graph-edge.schema.json
    source-map.schema.json
    coverage-ledger.schema.json
  reports/
    validation-report.md
```

Each file answers one primary question. Catalogs and graph records are not prose
documents and therefore may aggregate identifiers without duplicating their
definitions.

## 8. Typed Dependency Graph

`graph/nodes.jsonl` contains one JSON object per knowledge identifier:

```json
{
  "id": "entity.patient",
  "kind": "domain-entity",
  "path": "03-domain/entities/entity.patient.md",
  "status": "observed"
}
```

`graph/edges.jsonl` contains one directed relationship per line:

```json
{
  "from": "api.backend.patient-create",
  "type": "writes",
  "to": "entity.patient",
  "evidence": ["backend/src/routes/patients.ts"],
  "confidence": "observed"
}
```

Required edge types:

- `contains`
- `belongs-to`
- `depends-on`
- `imports`
- `calls`
- `consumes`
- `produces`
- `reads`
- `writes`
- `persists-as`
- `exposes`
- `invokes`
- `publishes`
- `subscribes-to`
- `authenticates-with`
- `authorizes-with`
- `configured-by`
- `deployed-by`
- `tested-by`
- `implements`
- `violates`
- `duplicates`
- `supersedes`
- `documents`

Every edge endpoint MUST exist in `nodes.jsonl`. Cycles MUST be reported with the
exact ordered node path and classified as expected runtime recursion, acceptable
mutual dependency, or architectural violation.

## 9. Scope and Extraction Rules

### 9.1 Projects and composition roots

The extractor MUST identify all package manifests, Python dependency manifests,
TypeScript configurations, entry points, server composition roots, browser
composition roots, worker entry points, and orchestration commands.

### 9.2 Public components

A component is public when at least one condition is true:

- it is exported across a TypeScript module boundary;
- it is imported by another project or architectural area;
- it registers an Express route or middleware;
- it defines a FastAPI endpoint or runtime service;
- it is a routed page or reusable React component;
- it is a Python class or function consumed outside its defining module;
- it is a CLI command, quality gate, deployment script, or CI/CD entry point;
- it implements a shared contract, provider, adapter, factory, manager,
  orchestrator, repository, helper, or utility used by another component.

Each public component unit MUST describe responsibility, inputs, outputs,
dependencies, side effects, consumers, error behavior, and source evidence.

### 9.3 API endpoints

Every Express and FastAPI endpoint receives an atomic endpoint unit containing:

- HTTP method and complete mounted path;
- route order and collision considerations;
- request path, query, header, form, file, and body parameters;
- validation rules and defaults;
- authentication and authorization requirements;
- invoked services and persistence operations;
- external interactions;
- response status codes and returned models;
- possible error status codes and their triggers;
- transaction and idempotency behavior;
- frontend or external consumers;
- tests that exercise the endpoint.

Mounted paths MUST be reconstructed from the application composition root, not
guessed from router-local paths.

### 9.4 Domain entities

Every Prisma model and every business entity represented outside Prisma receives
an entity unit. Each unit MUST include:

- business purpose;
- owning bounded context;
- identity and natural keys;
- fields and value semantics;
- relationships and cardinalities;
- creation, update, transition, and deletion lifecycle;
- invariants from schema, code, tests, and requirements;
- persistence owner;
- exposed endpoints and UI consumers;
- audit, privacy, and retention behavior;
- unresolved divergence between declared and implemented rules.

### 9.5 Database

The data model MUST include all Prisma models, enums, relations, indexes,
uniqueness constraints, defaults, nullability, cascading behavior, raw SQL, and
seed assumptions.

Migration units MUST preserve chronological order and explain:

- schema delta;
- data backfill;
- destructive or irreversible operations;
- compatibility assumptions;
- relationship to the current Prisma schema;
- tests or runtime paths affected.

Current schema and migration history MUST both be represented when they differ.

### 9.6 Runtime and business flows

Important workflows receive one atomic flow unit and a deterministic sequence
table. Each step contains actor, component identifier, input, validation,
operation, state change, output, failure branch, and evidence.

Required flow families include:

- application startup and shutdown;
- user authentication and token propagation;
- patient creation and update;
- patient intake and document import;
- clinical-document access;
- therapy creation and medication administration;
- diary and narrative-section management;
- appointments and operator scheduling;
- AI assistant planning and composition;
- AI document job creation, execution, retry, cancellation, and result retrieval;
- frontend navigation and API request handling;
- quality-gate task validation;
- agent-team development and independent QA handoff;
- build, migration, deployment, and production health checking.

Additional flows discovered from routes, UI actions, tests, scripts, or
migrations MUST be added.

### 9.7 Configuration

Configuration extraction MUST find:

- environment-variable reads;
- `.env` example declarations without secret values;
- Vite variables;
- Express and FastAPI settings;
- provider profiles;
- connection-string consumers;
- feature or mode switches;
- authentication modes;
- CORS origins;
- ports and URLs;
- Prisma configuration;
- Docker Compose settings;
- Railway and Vercel settings;
- GitHub Actions variables and secrets by name only;
- CLI flags and script parameters.

Every configuration key unit MUST state source, type, default, required
environments, validation, consumers, operational effect, security
classification, and failure behavior.

### 9.8 Tests and documentation

Tests MUST be mapped to components, endpoints, entities, invariants, and flows.
The knowledge base MUST distinguish unit, integration, contract, end-to-end,
Playwright, security, migration, and quality-gate evidence.

Requirements and narrative documents MUST be indexed by the concepts they
declare. A declaration without executable evidence is marked `declared`.

### 9.9 Binary, generated, and historical artifacts

All repository paths are represented in the coverage ledger.

Generated dependency folders, Git internals, caches, and reproducible build
outputs are classified by path rule and excluded from semantic extraction.
Authored archives, screenshots, PDFs, videos, logs, QA evidence, and deployment
artifacts are represented by metadata, provenance, hash, purpose, producer, and
related task. Their binary payload is not duplicated into Markdown.

## 10. Automated Extraction Pipeline

The implementation MUST add deterministic scripts under `scripts/nhw/`.

Pipeline stages:

1. `inventory`: enumerate repository paths, classify each path, compute hashes,
   and record exclusions.
2. `discover-projects`: find projects, manifests, composition roots, scripts,
   and deployment surfaces.
3. `extract-typescript`: collect imports, exports, routes, middleware,
   functions, classes, interfaces, records, React components, and configuration
   reads.
4. `extract-python`: collect modules, imports, classes, functions, FastAPI
   routes, provider adapters, models, and configuration reads.
5. `extract-prisma`: collect models, enums, fields, relations, indexes,
   constraints, and migration lineage.
6. `extract-infrastructure`: collect Docker, CI/CD, Railway, Vercel, shell,
   PowerShell, and package-script behavior.
7. `extract-tests`: map tests and objective evidence to production concepts.
8. `build-graph`: emit sorted nodes and typed edges.
9. `build-coverage`: reconcile source inventory against semantic artifacts.
10. `validate`: execute schema, identity, reference, coverage, freshness, and
    duplication checks.

Machine-generated records MUST be sorted by identifier and serialized with
stable key order and LF line endings. Re-running against an unchanged working
tree MUST produce no diff.

## 11. Curated Reasoning Pass

Static extraction cannot reliably reconstruct every business rule. After
machine extraction, the agent MUST perform a curated pass over:

- composition roots;
- route implementations;
- Prisma schema and every migration;
- authentication and authorization middleware;
- import, therapy, diary, scheduling, document, and AI workflows;
- tests covering failure behavior;
- requirements that define invariants;
- deployment and quality-gate scripts.

The curated pass owns:

- bounded-context boundaries;
- lifecycle interpretation;
- hidden contracts;
- implicit assumptions;
- architectural patterns;
- duplicated logic;
- hidden coupling;
- dead abstractions;
- architectural violations;
- technical debt;
- future extension points.

Findings MUST be factual, source-linked, and impact-classified. Remediation
recommendations are optional because the mission is system modeling rather than
code review.

## 12. Validation Contract

The validation command MUST fail when any condition is true:

- duplicate or malformed identifier;
- missing required Markdown heading;
- invalid frontmatter;
- graph edge references a missing node;
- knowledge link references a missing identifier;
- source reference points to a missing path;
- route exists without an endpoint unit;
- Prisma model exists without entity and data-model units;
- migration exists without a migration unit;
- configuration read exists without a configuration-key unit;
- public component exists without a component unit or explicit exclusion;
- important source file is absent from the coverage ledger;
- generated artifact is stale relative to the source inventory hash;
- the same canonical definition is duplicated across knowledge units;
- secret-like values appear in generated artifacts.

The final report MUST include exact measured totals for:

- repository paths by classification;
- projects and composition roots;
- public components by kind;
- API endpoints by runtime;
- domain entities and data models;
- migrations, indexes, constraints, and raw SQL usages;
- configuration keys and sources;
- runtime and business flows;
- tests and mapped concepts;
- graph nodes, edges, cycles, and orphans;
- architectural findings by classification;
- documented, excluded, and unresolved coverage.

An unresolved item is allowed only when it names the missing evidence, explains
why the repository cannot resolve it, and identifies the affected concepts.

## 13. Completeness Gate

The knowledge base is complete only when:

1. Every repository path is documented, metadata-only, generated-excluded, or
   explicitly excluded with a deterministic rule.
2. Every detected endpoint, public component, Prisma model, migration,
   configuration read, test surface, and composition root is mapped.
3. Every graph edge resolves to existing nodes.
4. Every knowledge claim has source evidence or an explicit inference record.
5. Every important user-to-persistence or user-to-external-system workflow has a
   sequence model and failure branches.
6. Documentation drift and unresolved ambiguity are explicit.
7. The validation command exits successfully.
8. A clean rerun against the same source inventory produces no changes.

Completion is an evidence state, not an author assertion.

## 14. Operational Boundaries

The NHW implementation MUST NOT:

- modify application behavior;
- rewrite existing documentation;
- change database schema or migrations;
- read or publish secret values;
- deploy, push, merge, or close issues;
- delete or normalize existing user files;
- claim runtime behavior that is supported only by narrative documentation.

The implementation MAY add extraction and validation scripts, schemas, atomic
knowledge units, catalogs, graphs, coverage ledgers, and validation evidence.

## 15. Acceptance Criteria

The delivered system satisfies this design when:

- `docs/nhw/README.md` explains deterministic retrieval and identifier rules;
- every directory and canonical artifact defined in Section 7 exists or is
  omitted only by a documented not-applicable rule;
- machine-readable artifacts validate against their JSON Schemas;
- all discovered Express and FastAPI routes have atomic endpoint units;
- all Prisma models and migrations have atomic data units;
- all public cross-module components are documented or explicitly excluded;
- important business processes have evidence-linked sequence models;
- configuration keys are documented without secret values;
- dependency cycles, hidden coupling, duplicated logic, architectural
  violations, dead abstractions, drift, and extension points are recorded;
- coverage and validation reports contain exact measured totals;
- the application source and existing user changes remain unmodified;
- the repository-level NHW validator exits with status code zero.
