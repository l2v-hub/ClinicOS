# ClinicOS NHW Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, evidence-linked, machine-oriented knowledge
base that models the complete current ClinicOS working tree for semantic
retrieval, graph traversal, autonomous reasoning, and measurable coverage.

**Architecture:** Atomic Markdown files are the canonical explanatory units.
Deterministic Node.js and Python extractors discover structural facts from
TypeScript, Python, Prisma, configuration, infrastructure, tests, and repository
artifacts. A compiler derives JSON/JSONL catalogs, a typed dependency graph,
source evidence, and coverage ledgers from those facts and the Markdown units;
validators fail closed on gaps, stale artifacts, broken references, duplicate
definitions, or secret-like values.

**Tech Stack:** Node.js 20+, ECMAScript modules, `node:test`, TypeScript compiler
API, Python 3 standard-library `ast`, Prisma schema and SQL migrations, JSON
Schema, Markdown with YAML frontmatter, JSONL, Git, PowerShell.

## Global Constraints

- Analyze the complete current working tree, including tracked modifications and
  untracked source or test files.
- Do not modify application behavior, frontend code, backend code, AI runtime
  code, Prisma schema, existing migrations, deployment behavior, or existing
  user changes.
- Generated NHW artifacts may exist only under `docs/nhw/`, `scripts/nhw/`, and
  `artifacts/task-validation/clinicos-nhw-knowledge-base/`.
- Runtime code, schema, migrations, tests, and executable configuration outrank
  narrative documentation.
- Never copy environment secret values into generated output.
- Every non-trivial claim must reference source evidence or an explicit
  inference rule.
- Every knowledge object uses one stable lowercase dot-separated identifier.
- Re-running generation against an unchanged source inventory must produce no
  diff.
- Completion requires a successful validator, exact coverage totals, and
  `Final Decision: CLOSED — VERIFIED`.
- Work on Windows and use PowerShell-safe commands and `npm.cmd`.
- Do not deploy, push, merge, close issues, delete files, or stage unrelated
  worktree changes.

---

## Planned File Structure

### Authoring and validation code

- Create `scripts/nhw/generate.mjs`: complete deterministic generation entry
  point.
- Create `scripts/nhw/validate.mjs`: repository-level validation entry point.
- Create `scripts/nhw/lib/contracts.mjs`: shared JSDoc types, identifier rules,
  sorting, hashing, JSONL, and stable JSON serialization.
- Create `scripts/nhw/lib/inventory.mjs`: complete repository path inventory,
  classification, hashing, and exclusion handling.
- Create `scripts/nhw/lib/typescript-extractor.mjs`: TypeScript/TSX imports,
  exports, public components, Express routes, route mounts, frontend requests,
  and environment reads.
- Create `scripts/nhw/lib/python-extractor.py`: Python imports, public symbols,
  FastAPI routes, lifecycle hooks, Pydantic models, environment reads, and
  provider classes.
- Create `scripts/nhw/lib/prisma-extractor.mjs`: Prisma models, enums, fields,
  relationships, indexes, constraints, and SQL migration lineage.
- Create `scripts/nhw/lib/repository-extractor.mjs`: package scripts, tests,
  CI/CD, Docker, Railway, Vercel, PowerShell, shell, requirements,
  specifications, and binary artifact metadata.
- Create `scripts/nhw/lib/markdown.mjs`: frontmatter parsing, common-heading
  enforcement, atomic-unit rendering, and knowledge-link extraction.
- Create `scripts/nhw/lib/graph.mjs`: graph-node and typed-edge compilation,
  cycle detection, orphan detection, and redirect resolution.
- Create `scripts/nhw/lib/coverage.mjs`: reconciliation between inventory,
  discoveries, knowledge units, exclusions, and evidence.
- Create `scripts/nhw/lib/validator.mjs`: schema, identity, evidence, reference,
  coverage, freshness, determinism, duplication, and secret scanning.

### Test fixtures and tests

- Create `scripts/nhw/test/fixtures/typescript/app.ts`.
- Create `scripts/nhw/test/fixtures/typescript/routes/patients.ts`.
- Create `scripts/nhw/test/fixtures/typescript/frontend.tsx`.
- Create `scripts/nhw/test/fixtures/python/app.py`.
- Create `scripts/nhw/test/fixtures/prisma/schema.prisma`.
- Create `scripts/nhw/test/fixtures/prisma/migrations/20260101000000_init/migration.sql`.
- Create `scripts/nhw/test/contracts.test.mjs`.
- Create `scripts/nhw/test/inventory.test.mjs`.
- Create `scripts/nhw/test/typescript-extractor.test.mjs`.
- Create `scripts/nhw/test/python-extractor.test.mjs`.
- Create `scripts/nhw/test/prisma-extractor.test.mjs`.
- Create `scripts/nhw/test/repository-extractor.test.mjs`.
- Create `scripts/nhw/test/markdown-graph.test.mjs`.
- Create `scripts/nhw/test/coverage-validator.test.mjs`.
- Create `scripts/nhw/test/determinism.test.mjs`.

### Package integration

- Modify `package.json`: add `nhw:generate`, `nhw:validate`, `nhw:check`, and
  `test:nhw`.
- Modify `package-lock.json`: declare the root development dependency on
  `typescript`, already used by workspace builds, so the root extractor has an
  explicit dependency instead of relying on workspace hoisting.

### Knowledge artifacts

- Create the complete `docs/nhw/` hierarchy defined by
  `docs/superpowers/specs/2026-07-25-clinicos-nhw-knowledge-base-design.md`.
- Create additional generated discovery catalogs under `docs/nhw/catalog/`:
  `projects.json`, `typescript-symbols.jsonl`, `python-symbols.jsonl`,
  `express-routes.jsonl`, `fastapi-routes.jsonl`,
  `frontend-api-requests.jsonl`, `prisma-models.jsonl`,
  `migration-lineage.jsonl`, `configuration-reads.jsonl`,
  `test-surfaces.jsonl`, and `repository-artifacts.jsonl`.
- Create `docs/nhw/coverage/inventory.jsonl` as the path-level source for
  `ledger.json`.
- Create `docs/nhw/reports/validation-report.md` as the canonical measured
  validation result.

### Quality-gate evidence

- Create
  `artifacts/task-validation/clinicos-nhw-knowledge-base/task-contract.md`.
- Create
  `artifacts/task-validation/clinicos-nhw-knowledge-base/validation-report.md`.
- Create
  `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/nhw-tests.txt`.
- Create
  `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/nhw-validation.txt`.
- Create
  `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/determinism.txt`.

---

### Task 1: Establish NHW contracts, schemas, and the repository quality gate

**Files:**

- Create:
  `artifacts/task-validation/clinicos-nhw-knowledge-base/task-contract.md`
- Create:
  `artifacts/task-validation/clinicos-nhw-knowledge-base/validation-report.md`
- Create: `scripts/nhw/lib/contracts.mjs`
- Create: `scripts/nhw/test/contracts.test.mjs`
- Create: `docs/nhw/schemas/manifest.schema.json`
- Create: `docs/nhw/schemas/graph-node.schema.json`
- Create: `docs/nhw/schemas/graph-edge.schema.json`
- Create: `docs/nhw/schemas/source-map.schema.json`
- Create: `docs/nhw/schemas/coverage-ledger.schema.json`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Produces:
  `normalizeId(value: string): string`
- Produces:
  `assertStableId(value: string): void`
- Produces:
  `stableJson(value: unknown): string`
- Produces:
  `writeJson(path: string, value: unknown): void`
- Produces:
  `writeJsonl(path: string, rows: object[]): void`
- Produces:
  `sha256(value: string | Buffer): string`
- Produces JSDoc types: `KnowledgeNode`, `KnowledgeEdge`, `SourceEvidence`,
  `InventoryRecord`, `DiscoveryRecord`, and `CoverageLedger`
- Consumers: every later extractor, compiler, and validator task.

- [ ] **Step 1: Generate the quality-gate artifacts**

Run:

```powershell
node scripts/quality-gate/create-task-contract.js "ClinicOS NHW knowledge base" --type refactor
```

Expected: the command creates the task directory and reports initial status
`IMPLEMENTED — NOT VERIFIED`.

- [ ] **Step 2: Replace the generated contract placeholders with exact scope**

Set impact classification to `Config / Env = yes` and all application behavior
areas to `no`. Set these acceptance criteria:

```markdown
- AC1: Every repository path is classified in the NHW coverage ledger.
- AC2: Every discovered public component, endpoint, model, migration,
  configuration read, test surface, composition root, and important workflow is
  documented or explicitly excluded with evidence.
- AC3: The NHW test suite, validator, secret scan, and deterministic rerun all
  pass without modifying application source.
```

Set Unit, Integration, and Security/privacy scan to `yes`; UI, API runtime,
Playwright, persistence, voice, OCR, and Agnos runtime validation remain `no`
because the deliverable is a static intelligence system.

- [ ] **Step 3: Validate the quality-gate contract**

Run:

```powershell
node scripts/quality-gate/validate-task-contract.js clinicos-nhw-knowledge-base
```

Expected: exit code `0` and a valid-contract message.

- [ ] **Step 4: Write failing tests for stable contracts**

Create `scripts/nhw/test/contracts.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { assertStableId, normalizeId, sha256, stableJson } from '../lib/contracts.mjs';

test('normalizes knowledge identifiers deterministically', () => {
  assert.equal(normalizeId(' API Backend / Patient Create '), 'api.backend.patient-create');
  assert.doesNotThrow(() => assertStableId('entity.patient'));
  assert.throws(() => assertStableId('Entity Patient'), /stable identifier/);
});

test('serializes object keys deterministically', () => {
  assert.equal(stableJson({ z: 1, a: { d: 2, b: 1 } }), '{"a":{"b":1,"d":2},"z":1}\n');
  assert.equal(sha256('same'), sha256('same'));
});
```

- [ ] **Step 5: Run the contract tests and confirm failure**

Run:

```powershell
node --test scripts/nhw/test/contracts.test.mjs
```

Expected: failure with `ERR_MODULE_NOT_FOUND` for `lib/contracts.mjs`.

- [ ] **Step 6: Implement the shared contract module**

Implement stable recursive key sorting, newline-terminated JSON, sorted JSONL
rows by `id` or the complete serialized row, SHA-256 hashing, and the identifier
pattern:

```js
export const STABLE_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

export function assertStableId(value) {
  if (!STABLE_ID_PATTERN.test(value)) {
    throw new Error(`Invalid stable identifier: ${value}`);
  }
}
```

`normalizeId` converts whitespace, slashes, underscores, and repeated
punctuation to one hyphen within dot-delimited semantic segments.

- [ ] **Step 7: Add the five JSON Schemas**

All schemas use draft 2020-12, `additionalProperties: false`, explicit required
fields, and the stable identifier pattern. `graph-edge.schema.json` restricts
`type` to the relationship vocabulary in the design specification.

- [ ] **Step 8: Add root package scripts and explicit TypeScript dependency**

Add:

```json
{
  "scripts": {
    "nhw:generate": "node scripts/nhw/generate.mjs",
    "nhw:validate": "node scripts/nhw/validate.mjs",
    "nhw:check": "npm run test:nhw && npm run nhw:generate && npm run nhw:validate",
    "test:nhw": "node --test scripts/nhw/test/*.test.mjs"
  },
  "devDependencies": {
    "typescript": "^6.0.2"
  }
}
```

Preserve all existing keys and regenerate the lockfile with:

```powershell
npm.cmd install --package-lock-only
```

- [ ] **Step 9: Run the contract test and package-format checks**

Run:

```powershell
node --test scripts/nhw/test/contracts.test.mjs
npm.cmd exec prettier -- --check package.json docs/nhw/schemas scripts/nhw
```

Expected: both commands pass.

- [ ] **Step 10: Commit only Task 1 files**

```powershell
git add -- package.json package-lock.json scripts/nhw/lib/contracts.mjs scripts/nhw/test/contracts.test.mjs docs/nhw/schemas artifacts/task-validation/clinicos-nhw-knowledge-base
git commit -m "feat(nhw): establish knowledge contracts"
```

### Task 2: Build the deterministic repository inventory

**Files:**

- Create: `scripts/nhw/generate.mjs`
- Create: `scripts/nhw/lib/inventory.mjs`
- Create: `scripts/nhw/test/inventory.test.mjs`
- Create: `docs/nhw/coverage/exclusions.json`
- Generate: `docs/nhw/coverage/inventory.jsonl`
- Generate: `docs/nhw/coverage/exclusions.json`

**Interfaces:**

- Consumes: `sha256`, `writeJson`, and `writeJsonl` from
  `scripts/nhw/lib/contracts.mjs`.
- Produces:
  `classifyPath(relativePath: string): { classification: string, reason: string }`
- Produces:
  `buildInventory(repoRoot: string): Promise<InventoryRecord[]>`
- Produces:
  `inventoryHash(records: InventoryRecord[]): string`
- Produces:
  `generateKnowledgeBase(options: { repoRoot: string, stage?: string }):
Promise<GenerationSummary>` with `inventory` implemented in this task and
  later stages registered by their owning tasks.
- Consumers: all extractors, the coverage compiler, baseline metadata, and
  determinism validation.

- [ ] **Step 1: Write inventory classification tests**

Test these exact cases:

```js
assert.deepEqual(classifyPath('backend/src/app.ts'), {
  classification: 'semantic-source',
  reason: 'application-source',
});
assert.equal(classifyPath('node_modules/pkg/index.js').classification, 'generated-excluded');
assert.equal(classifyPath('.git/objects/aa/bb').classification, 'generated-excluded');
assert.equal(
  classifyPath('artifacts/task-validation/239/evidence.png').classification,
  'metadata-only',
);
assert.equal(
  classifyPath('prisma/migrations/20260101000000_init/migration.sql').classification,
  'semantic-source',
);
```

Also create a temporary fixture with tracked-looking, untracked-looking, binary,
and text paths; assert POSIX separators, lexical sorting, SHA-256 for files, and
no file-content field for metadata-only binaries.

- [ ] **Step 2: Run the inventory test and confirm failure**

Run:

```powershell
node --test scripts/nhw/test/inventory.test.mjs
```

Expected: missing-module failure.

- [ ] **Step 3: Implement inventory classification**

Classification vocabulary:

- `semantic-source`
- `narrative-source`
- `test-source`
- `configuration-source`
- `deployment-source`
- `metadata-only`
- `generated-excluded`

Rules MUST explicitly cover `.git`, `node_modules`, `dist`, build caches,
coverage output, Playwright output, `.worktrees`, logs, archives, images, PDFs,
videos, task-validation evidence, requirements, specifications, source code,
SQL, manifests, and root operational files.

- [ ] **Step 4: Implement complete working-tree enumeration**

Use Node filesystem traversal rather than `git ls-files` so current untracked
source and tests are included. Do not follow directory symlinks. Each
`InventoryRecord` contains:

```js
{
  (path, extension, bytes, sha256, classification, reason, gitState);
}
```

Obtain `gitState` with one read-only `git status --porcelain=v1 -z
--untracked-files=all` call and map values to `tracked-clean`,
`tracked-modified`, `untracked`, or `ignored`.

- [ ] **Step 5: Implement the staged generation entry point**

Parse `--stage <name>`, resolve the repository root from `process.cwd()`, and
dispatch to a fixed stage registry. The initial registry contains only
`inventory`; Tasks 3 through 7 add their stage functions without changing the
CLI contract. A missing stage exits non-zero and prints the sorted allowed
values.

- [ ] **Step 6: Run inventory tests**

Run:

```powershell
node --test scripts/nhw/test/inventory.test.mjs
```

Expected: all inventory tests pass.

- [ ] **Step 7: Generate and inspect the real inventory**

Run:

```powershell
npm.cmd run nhw:generate -- --stage inventory
```

Expected: `inventory.jsonl` is lexically sorted, includes the three known
modified application files and untracked AI runtime test present at baseline,
and records excluded directories without traversing their payload.

- [ ] **Step 8: Commit Task 2**

```powershell
git add -- scripts/nhw/generate.mjs scripts/nhw/lib/inventory.mjs scripts/nhw/test/inventory.test.mjs docs/nhw/coverage
git commit -m "feat(nhw): inventory complete working tree"
```

### Task 3: Extract TypeScript, Express, React, and frontend API intelligence

**Files:**

- Create: `scripts/nhw/lib/typescript-extractor.mjs`
- Create: `scripts/nhw/test/typescript-extractor.test.mjs`
- Create: `scripts/nhw/test/fixtures/typescript/app.ts`
- Create: `scripts/nhw/test/fixtures/typescript/routes/patients.ts`
- Create: `scripts/nhw/test/fixtures/typescript/frontend.tsx`
- Generate: `docs/nhw/catalog/typescript-symbols.jsonl`
- Generate: `docs/nhw/catalog/express-routes.jsonl`
- Generate: `docs/nhw/catalog/frontend-api-requests.jsonl`
- Generate: `docs/nhw/catalog/configuration-reads.jsonl`

**Interfaces:**

- Consumes: semantic TypeScript and TSX paths from Task 2.
- Produces:
  `extractTypeScript(repoRoot: string, paths: string[]): TypeScriptDiscovery`
- Produces:
  `reconstructExpressRoutes(files: SourceFile[]): ExpressRouteRecord[]`
- Produces:
  `extractFrontendRequests(files: SourceFile[]): FrontendRequestRecord[]`
- `ExpressRouteRecord` includes method, router path, mounted path, router symbol,
  middleware, handler symbol, request reads, response statuses, Prisma calls,
  external calls, source span, and tests.
- Consumers: endpoint documents, component documents, graph edges, frontend
  data flows, configuration units, and coverage.

- [ ] **Step 1: Create the synthetic TypeScript fixture**

The fixture application mounts `patientsRouter` at `/patients`; the router
defines `GET /:id` with `requireAuth`, reads `req.params.id`, calls
`prisma.patient.findUnique`, and returns 200 or 404. The frontend fixture calls
`${API_URL}/patients/${patientId}` and reads `VITE_API_URL`.

- [ ] **Step 2: Write failing extractor tests**

Assert:

```js
assert.equal(result.routes[0].method, 'GET');
assert.equal(result.routes[0].mountedPath, '/patients/:id');
assert.deepEqual(result.routes[0].middleware, ['requireAuth']);
assert.deepEqual(result.routes[0].responseStatuses, [200, 404]);
assert.deepEqual(result.routes[0].persistenceCalls, ['prisma.patient.findUnique']);
assert.equal(result.frontendRequests[0].method, 'GET');
assert.equal(result.frontendRequests[0].pathTemplate, '/patients/${patientId}');
assert.deepEqual(result.configurationReads, ['VITE_API_URL']);
```

Add tests for multiline route declarations, aliased router imports, two routers
mounted at the same prefix, default exports, interfaces, type aliases, classes,
functions, React components, and imported consumers.

- [ ] **Step 3: Run tests and confirm failure**

Run:

```powershell
node --test scripts/nhw/test/typescript-extractor.test.mjs
```

Expected: missing extractor module.

- [ ] **Step 4: Implement TypeScript program construction**

Load both `backend/tsconfig.json` and `frontend/tsconfig.json` with the
TypeScript compiler API. Add remaining `.ts`, `.tsx`, `.mts`, and `.mjs` source
paths from the inventory as syntax-only source files. Exclude test files from
production component classification while retaining them as test surfaces.

- [ ] **Step 5: Implement symbol and dependency extraction**

Record imports, exports, functions, classes, interfaces, type aliases, exported
constants, React components, route handlers, middleware, cross-file consumers,
side-effect imports, and composition roots. Use source spans with one-based
start and end lines.

- [ ] **Step 6: Implement Express mount and endpoint reconstruction**

Parse `app.use(prefix, router)` and `router.METHOD(path, ...handlers)` calls,
resolve imported router symbols, concatenate normalized paths, preserve route
order, and record middleware before the final handler.

Extract reads from `req.params`, `req.query`, `req.body`, `req.headers`, file
uploads, `res.status`, `res.json`, Prisma method calls, `fetch`, timers,
background-worker calls, and process exits.

- [ ] **Step 7: Implement frontend request extraction**

Detect global and wrapped `fetch` calls, static and template paths, explicit
method options, authentication-header helpers, upload bodies, and the React
component or hook containing each call. Link a request to an Express endpoint
when method and normalized path shape match.

- [ ] **Step 8: Run tests and generate real catalogs**

Run:

```powershell
node --test scripts/nhw/test/typescript-extractor.test.mjs
npm.cmd run nhw:generate -- --stage typescript
```

Expected: tests pass; `/health`, all routers mounted in
`backend/src/app.ts`, the background sweep and inline worker in
`backend/src/server.ts`, and frontend request consumers appear in catalogs.

- [ ] **Step 9: Commit Task 3**

```powershell
git add -- scripts/nhw/lib/typescript-extractor.mjs scripts/nhw/test/typescript-extractor.test.mjs scripts/nhw/test/fixtures/typescript docs/nhw/catalog
git commit -m "feat(nhw): extract TypeScript runtime topology"
```

### Task 4: Extract Python, FastAPI, Agno, and provider intelligence

**Files:**

- Create: `scripts/nhw/lib/python-extractor.py`
- Create: `scripts/nhw/test/python-extractor.test.mjs`
- Create: `scripts/nhw/test/fixtures/python/app.py`
- Generate: `docs/nhw/catalog/python-symbols.jsonl`
- Generate: `docs/nhw/catalog/fastapi-routes.jsonl`
- Extend: `docs/nhw/catalog/configuration-reads.jsonl`

**Interfaces:**

- Consumes: Python paths from the inventory.
- Command:
  `python scripts/nhw/lib/python-extractor.py --repo-root <absolute-path>
--paths-file <json-file>`
- Writes JSON to stdout with `symbols`, `imports`, `routes`, `lifecycleHooks`,
  `configurationReads`, and `providerClasses`.
- Consumers: AI runtime components, API endpoints, configuration, model
  registry, external integrations, graph, and coverage.

- [ ] **Step 1: Create the Python fixture**

Define a FastAPI app with startup hook, public `GET /health`, bearer-protected
`POST /jobs/{job_id}/run`, Pydantic request and response classes,
`os.environ.get("SERVICE_TOKEN")`, `asyncio.create_task`, and one provider
subclass.

- [ ] **Step 2: Write the failing Node integration test**

Spawn the extractor with `python`, parse stdout, and assert route method, path,
decorator status code, request model, authorization header, environment key,
background-task side effect, public class/function symbols, and source spans.

- [ ] **Step 3: Run the test and confirm failure**

Run:

```powershell
node --test scripts/nhw/test/python-extractor.test.mjs
```

Expected: Python reports that the extractor file is missing.

- [ ] **Step 4: Implement Python AST extraction**

Use only Python standard-library modules: `argparse`, `ast`, `json`, `pathlib`,
and `sys`. Never import ClinicOS runtime modules because provider SDKs or
environment settings may have side effects.

Recognize `FastAPI`, `APIRouter`, `app.get/post/put/patch/delete`,
`app.on_event`, classes, dataclasses, Pydantic models, async functions, imports,
environment access, raised `HTTPException` status codes, calls to
`asyncio.create_task`, registry construction, and provider inheritance.

- [ ] **Step 5: Run tests and generate real catalogs**

Run:

```powershell
node --test scripts/nhw/test/python-extractor.test.mjs
npm.cmd run nhw:generate -- --stage python
```

Expected: all twelve FastAPI routes in
`clinicos-ai-runtime/clinicos_ai/api/app.py`, startup model logging,
service-token enforcement, in-process job storage, background processing, model
registry, and provider adapters are represented.

- [ ] **Step 6: Commit Task 4**

```powershell
git add -- scripts/nhw/lib/python-extractor.py scripts/nhw/test/python-extractor.test.mjs scripts/nhw/test/fixtures/python docs/nhw/catalog
git commit -m "feat(nhw): extract Python AI runtime topology"
```

### Task 5: Extract Prisma schema and migration history

**Files:**

- Create: `scripts/nhw/lib/prisma-extractor.mjs`
- Create: `scripts/nhw/test/prisma-extractor.test.mjs`
- Create: `scripts/nhw/test/fixtures/prisma/schema.prisma`
- Create:
  `scripts/nhw/test/fixtures/prisma/migrations/20260101000000_init/migration.sql`
- Generate: `docs/nhw/catalog/prisma-models.jsonl`
- Generate: `docs/nhw/catalog/migration-lineage.jsonl`

**Interfaces:**

- Produces:
  `parsePrismaSchema(text: string, sourcePath: string): PrismaCatalog`
- Produces:
  `parseMigration(sql: string, migrationId: string): MigrationRecord`
- Produces:
  `buildMigrationLineage(schema: PrismaCatalog, migrations:
MigrationRecord[]): MigrationLineage`
- Records models, enums, fields, types, nullability, defaults, IDs, uniqueness,
  relationships, referential actions, indexes, SQL statements, destructive
  operations, and current-schema reconciliation.
- Consumers: domain entities, data-model units, migration units, graph, flows,
  findings, and coverage.

- [ ] **Step 1: Create schema and SQL fixtures**

The fixture contains `User`, `Patient`, and `Appointment`, one enum, optional and
required relations, `@id`, `@unique`, `@@index`, `@@unique`, default timestamps,
and cascade behavior. The migration creates tables and indexes and later adds a
unique constraint.

- [ ] **Step 2: Write failing schema tests**

Assert exact field count, relation cardinality, natural key, index columns,
unique columns, default expressions, enum values, SQL operation order,
destructive-operation classification, and lineage reconciliation.

- [ ] **Step 3: Run tests and confirm failure**

Run:

```powershell
node --test scripts/nhw/test/prisma-extractor.test.mjs
```

Expected: missing extractor module.

- [ ] **Step 4: Implement the Prisma parser**

Implement a tokenizer that strips line comments without corrupting quoted
strings, recognizes balanced model and enum blocks, parses attributes, and
preserves source line numbers. Do not rely on regex alone for nested attribute
arguments.

- [ ] **Step 5: Implement SQL migration parsing**

Split PostgreSQL statements while respecting quoted strings. Classify
`CREATE/ALTER/DROP TABLE`, columns, constraints, indexes, data updates,
backfills, and destructive operations. Preserve raw statement hashes instead of
duplicating full migration SQL in Markdown.

- [ ] **Step 6: Run tests and generate real catalogs**

Run:

```powershell
node --test scripts/nhw/test/prisma-extractor.test.mjs
npm.cmd run nhw:generate -- --stage prisma
```

Expected: every model and enum in `prisma/schema.prisma` and every migration
directory under `prisma/migrations/` is represented in chronological order.

- [ ] **Step 7: Commit Task 5**

```powershell
git add -- scripts/nhw/lib/prisma-extractor.mjs scripts/nhw/test/prisma-extractor.test.mjs scripts/nhw/test/fixtures/prisma docs/nhw/catalog
git commit -m "feat(nhw): model Prisma and migration lineage"
```

### Task 6: Extract configuration, infrastructure, scripts, tests, and artifacts

**Files:**

- Create: `scripts/nhw/lib/repository-extractor.mjs`
- Create: `scripts/nhw/test/repository-extractor.test.mjs`
- Generate: `docs/nhw/catalog/projects.json`
- Generate: `docs/nhw/catalog/test-surfaces.jsonl`
- Generate: `docs/nhw/catalog/repository-artifacts.jsonl`
- Extend: `docs/nhw/catalog/configuration-reads.jsonl`

**Interfaces:**

- Consumes: inventory records and discoveries from Tasks 3 through 5.
- Produces:
  `extractRepositorySurfaces(repoRoot: string, inventory:
InventoryRecord[]): RepositoryDiscovery`
- Produces project, manifest, package-script, CI job, deployment, container,
  configuration-source, test-surface, requirement, documentation, and artifact
  records.
- Consumers: project catalog, configuration units, infrastructure units, test
  graph, documentation-drift findings, and coverage.

- [ ] **Step 1: Write failing repository-surface tests**

Use an in-memory fixture containing `package.json`, a GitHub Actions workflow,
Docker Compose, Railway configuration, Vercel configuration, `.env.example`,
PowerShell, shell, a test file, a requirement, and binary metadata. Assert
project scripts, workflow triggers and jobs, service image/ports/volumes,
deployment commands, configuration-key names, test type, requirement identity,
and metadata-only binary handling.

- [ ] **Step 2: Run tests and confirm failure**

Run:

```powershell
node --test scripts/nhw/test/repository-extractor.test.mjs
```

Expected: missing extractor module.

- [ ] **Step 3: Implement manifest and script extraction**

Parse root, frontend, and backend package manifests; Python requirements; Docker
files; Compose; Railway; Vercel; PowerShell; shell scripts; root operational
files; and agent-team configuration. Shell parsing is declarative: record
commands, parameters, environment-key names, and subprocess relationships
without executing them.

- [ ] **Step 4: Implement CI/CD and configuration extraction**

Parse GitHub Actions YAML using a conservative indentation-aware reader that
captures triggers, jobs, dependencies, environments, commands, secret names,
artifact paths, and deployment targets. Never record secret values.

Merge environment reads from TypeScript and Python with declarations from
examples, workflows, Docker, Railway, and Vercel. Each key records sources,
consumers, defaults, required modes, security classification, and fail-open or
fail-closed behavior.

- [ ] **Step 5: Implement test and artifact classification**

Classify `*.test.ts`, `*.test.mjs`, `test_*.py`, E2E, Playwright, contract,
security, migration, governance, and quality-gate evidence. Map tests to
production concepts using imports, route strings, identifiers, requirement
references, and artifact task slugs.

- [ ] **Step 6: Generate real repository catalogs**

Run:

```powershell
node --test scripts/nhw/test/repository-extractor.test.mjs
npm.cmd run nhw:generate -- --stage repository
```

Expected: all workspaces, AI runtime, agent-team, GitHub workflows, Docker,
Railway, Vercel, scripts, requirements, specs, tests, and authored evidence
artifacts appear.

- [ ] **Step 7: Commit Task 6**

```powershell
git add -- scripts/nhw/lib/repository-extractor.mjs scripts/nhw/test/repository-extractor.test.mjs docs/nhw/catalog
git commit -m "feat(nhw): extract repository operations"
```

### Task 7: Compile Markdown units, graph, evidence, and coverage

**Files:**

- Create: `scripts/nhw/validate.mjs`
- Create: `scripts/nhw/lib/markdown.mjs`
- Create: `scripts/nhw/lib/graph.mjs`
- Create: `scripts/nhw/lib/coverage.mjs`
- Create: `scripts/nhw/lib/validator.mjs`
- Create: `scripts/nhw/test/markdown-graph.test.mjs`
- Create: `scripts/nhw/test/coverage-validator.test.mjs`
- Generate: `docs/nhw/catalog/manifest.json`
- Generate: `docs/nhw/catalog/redirects.json`
- Generate: `docs/nhw/graph/nodes.jsonl`
- Generate: `docs/nhw/graph/edges.jsonl`
- Generate: `docs/nhw/evidence/source-map.jsonl`
- Generate: `docs/nhw/coverage/ledger.json`

**Interfaces:**

- `parseKnowledgeUnit(path: string, text: string): KnowledgeUnit`
- `renderKnowledgeUnit(unit: KnowledgeUnit): string`
- `compileGraph(units: KnowledgeUnit[], discoveries:
DiscoveryRecord[]): KnowledgeGraph`
- `detectCycles(graph: KnowledgeGraph): CycleRecord[]`
- `buildCoverage(inventory: InventoryRecord[], discoveries:
DiscoveryRecord[], units: KnowledgeUnit[]): CoverageLedger`
- `validateKnowledgeBase(options: { repoRoot: string, allowUnresolved?:
boolean }): Promise<ValidationResult>`
- Consumers: final validator and all future autonomous agents.

- [ ] **Step 1: Write failing Markdown contract tests**

Test complete frontmatter parsing, all eleven required headings, `None observed`
handling, stable relation targets, source references, explicit inferred status,
duplicate canonical definition detection, and byte-stable render/parse/render.

- [ ] **Step 2: Write failing graph and coverage tests**

Use three units and discovery records to assert typed edges, source evidence,
one detected cycle, no orphan nodes, redirect resolution, an uncovered route
failure, and success after the missing endpoint unit is added.

- [ ] **Step 3: Run tests and confirm failure**

Run:

```powershell
node --test scripts/nhw/test/markdown-graph.test.mjs scripts/nhw/test/coverage-validator.test.mjs
```

Expected: missing modules.

- [ ] **Step 4: Implement the Markdown contract**

Use a restricted YAML-frontmatter parser supporting strings, string arrays, and
arrays of objects required by the specification. Reject aliases, executable
tags, duplicate keys, unknown common-frontmatter fields, and missing headings.

- [ ] **Step 5: Implement graph compilation**

Create nodes from every unit and structural discovery. Create edges from
frontmatter relations, imports, calls, route consumers, persistence calls,
configuration consumers, tests, deployment relationships, and source
precedence. Sort edges by `from`, `type`, `to`, and evidence.

- [ ] **Step 6: Implement evidence and coverage compilation**

Every claim and edge receives path, symbol, line span, file hash, and
`observed`, `inferred`, or `declared` confidence. Reconcile every inventory path
and every discovery into documented, metadata-only, generated-excluded, or
unresolved.

- [ ] **Step 7: Implement the structural validator entry point**

Validate stable identifiers, common Markdown headings, relation targets, source
paths, graph endpoints, redirects, inventory reconciliation, and unresolved
counts. Support `--allow-unresolved` only for the authoring checkpoints in
Tasks 8 and 9; it never suppresses malformed artifacts or broken references.

- [ ] **Step 8: Run tests**

Run:

```powershell
node --test scripts/nhw/test/markdown-graph.test.mjs scripts/nhw/test/coverage-validator.test.mjs
```

Expected: all tests pass.

- [ ] **Step 9: Commit Task 7**

```powershell
git add -- scripts/nhw/validate.mjs scripts/nhw/lib/markdown.mjs scripts/nhw/lib/graph.mjs scripts/nhw/lib/coverage.mjs scripts/nhw/lib/validator.mjs scripts/nhw/test/markdown-graph.test.mjs scripts/nhw/test/coverage-validator.test.mjs
git commit -m "feat(nhw): compile semantic knowledge graph"
```

### Task 8: Author system, context, domain, data, and component knowledge units

**Files:**

- Create: `docs/nhw/README.md`
- Create: `docs/nhw/00-contract/ontology.md`
- Create: `docs/nhw/00-contract/source-precedence.md`
- Create: `docs/nhw/00-contract/retrieval-contract.md`
- Create: `docs/nhw/00-contract/exclusions.md`
- Create all units under `docs/nhw/01-system/`
- Create all bounded-context units under `docs/nhw/02-contexts/`
- Create all entity, value-object, and rule units under `docs/nhw/03-domain/`
- Create all public-component units under `docs/nhw/04-components/`
- Create all data-model, migration, index, and raw-SQL units under
  `docs/nhw/07-data/`

**Interfaces:**

- Consumes: discoveries and common unit contract from Tasks 2 through 7.
- Produces canonical Markdown definitions used to compile graph, evidence, and
  coverage.
- No explanatory definition is duplicated across units; related units link by
  stable identifier.

- [ ] **Step 1: Author the retrieval and ontology contract**

Document exact stable-ID lookup, frontmatter filters, source precedence,
confidence meanings, graph traversal, freshness checks, exclusion rules, and
the query strategy for endpoint, entity, flow, configuration, and finding
questions.

- [ ] **Step 2: Author system and project units**

Model:

- `system.clinicos`
- `project.frontend`
- `project.backend`
- `project.ai-runtime`
- `project.agent-team`
- `project.prisma`
- `project.repository-automation`

Create separate startup, lifecycle, dependency-topology, architectural-pattern,
and cross-cutting-concern units. Evidence must include real composition roots,
manifests, tests, and deployment files.

- [ ] **Step 3: Author bounded-context units**

Use these evidence-backed contexts:

- `context.identity-access`
- `context.patient-registry`
- `context.clinical-record`
- `context.therapy-administration`
- `context.intake-document-processing`
- `context.facility-occupancy`
- `context.scheduling`
- `context.operator-collaboration`
- `context.ai-assistance`
- `context.delivery-quality-governance`

Each unit states ownership, entities, APIs, persistence, UI consumers,
integrations, invariants, and cross-context dependencies.

- [ ] **Step 4: Author one entity and one data-model unit per Prisma model**

The required current model set begins with `User`, `Operator`,
`OperatorSchedule`, `Patient`, `PatientNarrativeSection`, `PatientDocument`,
`Cartella`, `ClinicalRecord`, `ClinicalNote`, `Appointment`,
`MedicationAdministration`, `PatientIntakeDocument`, `PatientTherapy`,
`TherapySchedule`, `Room`, `Bed`, `PatientRoomAssignment`, `Consegna`, `Nota`,
`PatientDiaryEntry`, `PatientIntakeDraft`, `ImportJob`, `ImportAudit`,
`ImportDocument`, and `AiAuditEvent`.

The extractor is authoritative if the current working-tree schema contains a
different set at execution time. Every unit includes identity, natural keys,
relationships, lifecycle, invariants, owner, persistence, exposed APIs, UI
consumers, privacy, deletion behavior, and evidence.

- [ ] **Step 5: Author value-object and business-rule units**

Create units for Prisma enums, therapy schedules and weekday semantics, clinical
narrative section keys, appointment state, room/bed occupancy interval,
medication-administration uniqueness, import-job state, AI action allowlist,
authentication mode, role/qualification semantics, codice-fiscale identity,
document-access policy, audit outcome, and retention/expiry behavior.

- [ ] **Step 6: Author every migration unit**

Process migration directories chronologically. For each unit record schema
delta, data mutation, constraints, compatibility assumptions, irreversible
operations, current-schema reconciliation, affected flows, and tests. Generate
separate index units only where an index has a distinct query-performance
contract.

- [ ] **Step 7: Author public-component units**

Create one unit per discovered exported or cross-boundary component for:

- Express composition, route modules, middleware, AI planners, gateways,
  upload/job worker, provider adapters, and shared backend helpers;
- React application composition, pages, navigation, shared clinical widgets,
  intake modules, Agnos hooks, authentication, caching, and API helpers;
- FastAPI composition, assistant/extraction agents, registry, factory,
  profiles, providers, domain contracts, document-profile processing, and
  configuration;
- agent-team CLI, commands, state machine, reconciler, workers, policies,
  protocol, adapters, recovery, remediation, locks, history, and sanitization;
- repository quality-gate, security, test, requirement, deployment, and
  orchestration scripts.

Use explicit exclusion records for private leaf functions that have no
cross-boundary consumer and no architectural side effect.

- [ ] **Step 8: Compile graph and inspect coverage gaps**

Run:

```powershell
npm.cmd run nhw:generate -- --stage compile
npm.cmd run nhw:validate -- --allow-unresolved
```

Expected: structural validation passes; remaining unresolved records are
limited to API, runtime flow, configuration, infrastructure, test, and finding
units assigned to Task 9.

- [ ] **Step 9: Commit Task 8**

```powershell
git add -- docs/nhw/README.md docs/nhw/00-contract docs/nhw/01-system docs/nhw/02-contexts docs/nhw/03-domain docs/nhw/04-components docs/nhw/07-data docs/nhw/catalog docs/nhw/graph docs/nhw/evidence docs/nhw/coverage
git commit -m "docs(nhw): model ClinicOS architecture and domain"
```

### Task 9: Author API, runtime, flow, configuration, infrastructure, and quality intelligence

**Files:**

- Create all units under `docs/nhw/05-runtime/`
- Create all units under `docs/nhw/06-api/`
- Create all units under `docs/nhw/08-flows/`
- Create all units under `docs/nhw/09-configuration/`
- Create all units under `docs/nhw/10-infrastructure/`
- Create all units under `docs/nhw/11-quality/`
- Create all units under `docs/nhw/12-repository/`

**Interfaces:**

- Consumes: complete discovery catalogs and Task 8 canonical concepts.
- Produces: endpoint contracts, runtime semantics, sequence models,
  configuration behavior, operational topology, test coverage, drift, and
  architecture findings.

- [ ] **Step 1: Author one endpoint unit per Express and FastAPI route**

For each route catalog record, inspect the entire handler and referenced
services. Record complete mounted path, route order, parameters, validation,
authentication, authorization, business logic, persistence, external calls,
side effects, response models, all observed statuses, errors, transactions,
idempotency, consumers, and tests.

The Express catalog includes the direct `/health` route and every router mounted
under `/admin`, `/patients`, `/appointments`, `/therapy-slots`,
`/patient-intake`, `/consegne`, `/operators`, `/notes`, `/intake/drafts`,
`/ai/extraction/jobs`, `/ai/extraction`, `/ai/assistant`, `/ai/voice`,
`/ai/actions`, `/ai/audit`, and `/internal/ai`.

The FastAPI catalog includes all `/v1/runtime`, `/v1/assistant`, and
`/v1/document-jobs` routes.

- [ ] **Step 2: Author API model and permission units**

Document request/response DTOs, TypeScript interfaces and types, Pydantic
models, upload formats, error envelopes, demo headers, Entra bearer claims,
service-token headers, role allowlists, internal-gateway authentication, and
frontend authentication-header construction.

- [ ] **Step 3: Author startup and lifecycle units**

Model frontend initialization, Express startup, CORS, JSON limits, AI config
status, retention sweep, inline worker switch, Prisma connection behavior,
FastAPI startup logging, in-process AI job state, model registry construction,
agent-team supervisor startup/recovery/shutdown, and deployment startup with
Prisma migration.

- [ ] **Step 4: Author business-flow sequence units**

Create sequence tables for:

- user authentication and token propagation;
- patient creation, codice-fiscale resolution, update, and deletion;
- patient room assignment;
- patient intake upload, extraction, review, apply, and draft confirmation;
- protected clinical document upload, list, and content access;
- therapy CRUD, schedule semantics, administration confirmation, and
  not-administered recording;
- patient diary and narrative-section management;
- appointments and operator schedules;
- consegne and note collaboration;
- Agnos text planning and allowlisted execution;
- assistant read planning, internal data gateway, result composition, and
  anti-invention checks;
- AI extraction job creation, worker execution, polling, retry, cancellation,
  audit, and retention;
- frontend navigation and shared API error handling;
- agent-team task claim, Claude development handoff, Codex QA, remediation, and
  closure;
- build, test, migration, Railway backend/runtime deployment, Vercel frontend
  deployment, and health checking.

Every row states trigger, actor, component ID, input, validation, state change,
output, failure branch, and evidence.

- [ ] **Step 5: Author configuration units**

Create one unit per merged configuration-key record. Distinguish variable name,
source, default, required environment, validation, consumers, behavior,
security classification, and failure policy. Explicitly model demo versus Entra
authentication and local versus Railway/Vercel/Azure provider configuration.

- [ ] **Step 6: Author infrastructure and integration units**

Model PostgreSQL Docker Compose, Prisma adapter, Railway backend, Railway AI
runtime, Vercel frontend, Azure Static Web Apps workflow if still active, GitHub
Actions workflows, Azure Entra ID/JWKS, Azure/OpenAI-compatible model providers,
Google, Mistral, Anthropic, local/mock providers, and browser-side OCR.

- [ ] **Step 7: Author test, governance, and repository units**

Map every test surface to concepts and distinguish unit, integration, contract,
E2E, Playwright, security, migration, and QA evidence. Document the quality
gate, closure contract, requirements queue, issue-first governance, deployment
traceability, agent-team protocol, and authored operational scripts.

- [ ] **Step 8: Author evidence-backed architecture findings**

Detect and record:

- import and project dependency cycles;
- route-order coupling;
- shared mutable or in-process state;
- frontend-to-backend contract duplication;
- repeated validation or persistence logic;
- public abstractions with no consumers;
- cross-context database access;
- hidden environment coupling;
- authentication-mode divergence;
- documentation/runtime drift, including actual backend default port versus
  stale README values;
- missing transactions around multi-write operations;
- dead or superseded deployment paths;
- extension points in provider, registry, gateway, worker, route, component,
  and agent-team contracts.

Each finding requires severity, affected IDs, evidence, operational
consequence, and confidence. Do not change application code.

- [ ] **Step 9: Compile and require zero unresolved semantic discoveries**

Run:

```powershell
npm.cmd run nhw:generate -- --stage compile
npm.cmd run nhw:validate
```

Expected: no undocumented endpoint, public component, model, migration,
configuration read, test surface, composition root, or significant artifact.

- [ ] **Step 10: Commit Task 9**

```powershell
git add -- docs/nhw/05-runtime docs/nhw/06-api docs/nhw/08-flows docs/nhw/09-configuration docs/nhw/10-infrastructure docs/nhw/11-quality docs/nhw/12-repository docs/nhw/catalog docs/nhw/graph docs/nhw/evidence docs/nhw/coverage
git commit -m "docs(nhw): complete runtime and operational intelligence"
```

### Task 10: Implement fail-closed validation and prove deterministic completeness

**Files:**

- Modify: `scripts/nhw/lib/validator.mjs`
- Modify: `scripts/nhw/validate.mjs`
- Modify: `scripts/nhw/generate.mjs`
- Create: `scripts/nhw/test/determinism.test.mjs`
- Update: `scripts/nhw/test/coverage-validator.test.mjs`
- Generate: `docs/nhw/reports/validation-report.md`
- Update:
  `artifacts/task-validation/clinicos-nhw-knowledge-base/validation-report.md`
- Create:
  `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/nhw-tests.txt`
- Create:
  `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/nhw-validation.txt`
- Create:
  `artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/determinism.txt`

**Interfaces:**

- `generateKnowledgeBase(options: { repoRoot: string, stage?: string }):
Promise<GenerationSummary>`
- `validateKnowledgeBase(options: { repoRoot: string, allowUnresolved?:
boolean }): Promise<ValidationResult>`
- CLI exits `0` only when every required check passes.

- [ ] **Step 1: Write failing end-to-end validator tests**

Construct temporary knowledge bases that independently fail for duplicate IDs,
missing headings, invalid frontmatter, missing graph nodes, broken knowledge
links, missing source paths, uncovered routes, models, migrations,
configuration reads, public components, inventory paths, stale hashes,
duplicate definitions, graph orphans, and secret-like values.

Assert the exact error code for each condition, such as
`NHW_UNCOVERED_ENDPOINT`, `NHW_STALE_INVENTORY`, and
`NHW_SECRET_VALUE_DETECTED`.

- [ ] **Step 2: Write the deterministic rerun test**

Copy the synthetic repository to two temporary directories, generate twice,
hash every generated file relative to `docs/nhw`, and assert identical path,
byte hash, JSON key order, JSONL order, and LF line endings.

- [ ] **Step 3: Run tests and confirm failure**

Run:

```powershell
node --test scripts/nhw/test/coverage-validator.test.mjs scripts/nhw/test/determinism.test.mjs
```

Expected: missing generator and validator modules.

- [ ] **Step 4: Implement the generation orchestrator**

Execute inventory, TypeScript, Python, Prisma, repository extraction, Markdown
compilation, graph, evidence, and coverage in fixed order. Write through a
temporary output directory and replace individual generated files only when
content differs. Never delete curated Markdown units.

- [ ] **Step 5: Implement the fail-closed validator**

Validate JSON documents against the committed schemas, parse every Markdown
unit, resolve graph and knowledge references, check source spans and hashes,
reconcile discoveries and inventory, detect duplicates and orphans, scan for
secret-like assignments and token patterns, and compare inventory hashes.

Return structured results:

```js
{
  ok,
  errors: [{ code, message, path, knowledgeId }],
  warnings: [{ code, message, path, knowledgeId }],
  totals: {
    inventoryPaths,
    projects,
    publicComponents,
    expressEndpoints,
    fastapiEndpoints,
    domainEntities,
    prismaModels,
    migrations,
    configurationKeys,
    flows,
    tests,
    graphNodes,
    graphEdges,
    cycles,
    orphans,
    findings,
    documented,
    excluded,
    unresolved
  }
}
```

- [ ] **Step 6: Run focused and full NHW tests**

Run:

```powershell
npm.cmd run test:nhw 2>&1 | Tee-Object -FilePath artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/nhw-tests.txt
```

Expected: every NHW test passes.

- [ ] **Step 7: Run generation and validation**

Run:

```powershell
npm.cmd run nhw:generate
npm.cmd run nhw:validate 2>&1 | Tee-Object -FilePath artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/nhw-validation.txt
```

Expected: validator exits `0`, reports zero orphans and zero unresolved required
discoveries, and emits exact totals.

- [ ] **Step 8: Prove working-tree determinism**

Record hashes of all `docs/nhw` files, rerun generation, compare hashes, and
store the command output:

```powershell
$before = Get-ChildItem -Recurse -File docs/nhw |
  Sort-Object FullName |
  ForEach-Object { "$($_.FullName.Substring($PWD.Path.Length))=$((Get-FileHash -Algorithm SHA256 $_.FullName).Hash)" }
npm.cmd run nhw:generate
$after = Get-ChildItem -Recurse -File docs/nhw |
  Sort-Object FullName |
  ForEach-Object { "$($_.FullName.Substring($PWD.Path.Length))=$((Get-FileHash -Algorithm SHA256 $_.FullName).Hash)" }
$diff = Compare-Object $before $after
if ($diff) { $diff; exit 1 }
node --test scripts/nhw/test/determinism.test.mjs 2>&1 |
  Tee-Object -FilePath artifacts/task-validation/clinicos-nhw-knowledge-base/test-results/determinism.txt
```

Expected: the hash comparison emits no rows and the determinism test passes.

- [ ] **Step 9: Run repository safety and regression checks**

Run:

```powershell
npm.cmd run security:scan-frontend
npm.cmd run build
npm.cmd test
git diff --check
```

Expected: secret scan, frontend/backend build, existing test suites, and diff
check pass. Any environment-dependent pre-existing failure is recorded with
exact command, output, and affected scope; it cannot be represented as NHW
validator success.

- [ ] **Step 10: Write both validation reports**

`docs/nhw/reports/validation-report.md` records source inventory hash, HEAD and
dirty-state baseline, exact totals, coverage percentages, cycles, orphans,
unresolved records, drift findings, command evidence, and final result.

The task-validation report maps:

- AC1 to coverage ledger and inventory totals;
- AC2 to zero unresolved discoveries and graph/source evidence;
- AC3 to test, validation, determinism, build, existing tests, and secret-scan
  logs.

Set `Final Decision: CLOSED — VERIFIED` only if all three acceptance criteria
pass and no required check remains unresolved.

- [ ] **Step 11: Validate the closure gate**

Run:

```powershell
node scripts/quality-gate/check-closure.js clinicos-nhw-knowledge-base
```

Expected: exit code `0`.

- [ ] **Step 12: Commit final NHW implementation and evidence**

```powershell
git add -- package.json package-lock.json scripts/nhw docs/nhw artifacts/task-validation/clinicos-nhw-knowledge-base
git commit -m "feat(nhw): deliver ClinicOS machine knowledge base"
```

- [ ] **Step 13: Inspect final scope without pushing**

Run:

```powershell
git status --short --branch
git log --oneline --max-count=12
git diff HEAD~1 --stat
```

Expected: only pre-existing user changes remain uncommitted; no push, deploy,
merge, or issue mutation occurs.

---

## Plan Self-Review Checklist

- [ ] Every requirement in the approved NHW design maps to at least one task.
- [ ] Every created or modified path has an owning task.
- [ ] Every extraction interface has an exact producer and consumer.
- [ ] Every implementation task starts from a failing test.
- [ ] Every generated artifact has a deterministic source.
- [ ] Every secret-bearing source is handled name-only.
- [ ] Every public component, endpoint, model, migration, configuration key,
      test surface, and repository path participates in coverage.
- [ ] Every task ends with independently reviewable evidence and a scoped
      commit.
- [ ] The final closure depends on measured validation, not a narrative claim.
