import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { writeJson, writeJsonl, writeText } from './contracts.mjs';
import { buildCoverage, buildSourceMap } from './coverage.mjs';
import { compileGraph, detectCycles, findOrphans } from './graph.mjs';
import { parseKnowledgeUnit, renderKnowledgeUnit } from './markdown.mjs';

function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== null) return fallback;
    throw error;
  }
}

function readJsonl(path) {
  try {
    return readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export function loadKnowledgeCatalogs(outputRoot) {
  const catalogRoot = join(outputRoot, 'catalog');
  return {
    projects: readJson(join(catalogRoot, 'projects.json'), {
      projects: [],
      packageScripts: [],
      workflows: [],
      containers: [],
      deployments: [],
      requirements: [],
    }),
    typescriptSymbols: readJsonl(join(catalogRoot, 'typescript-symbols.jsonl')),
    pythonSymbols: readJsonl(join(catalogRoot, 'python-symbols.jsonl')),
    expressRoutes: readJsonl(join(catalogRoot, 'express-routes.jsonl')),
    fastapiRoutes: readJsonl(join(catalogRoot, 'fastapi-routes.jsonl')),
    frontendRequests: readJsonl(join(catalogRoot, 'frontend-api-requests.jsonl')),
    prismaModels: readJsonl(join(catalogRoot, 'prisma-models.jsonl')),
    migrations: readJsonl(join(catalogRoot, 'migration-lineage.jsonl')),
    configuration: readJsonl(join(catalogRoot, 'configuration-reads.jsonl')),
    tests: readJsonl(join(catalogRoot, 'test-surfaces.jsonl')),
  };
}

function projectSource(project) {
  if (project.manifestPath) return project.manifestPath;
  if (project.name === 'agent-team') return 'agent-team/src/cli.mjs';
  if (project.name === 'prisma') return 'prisma/schema.prisma';
  if (project.name === 'repository-automation') return 'scripts/quality-gate/check-closure.js';
  return project.path === '.' ? 'package.json' : `${project.path}/package.json`;
}

function discovery(record, kind, sourcePath) {
  return {
    id: record.id,
    kind,
    sourcePath,
    lineStart: Number(record.lineStart ?? 1),
    lineEnd: Number(record.lineEnd ?? record.lineStart ?? 1),
  };
}

export function buildDiscoveryRecords(catalogs) {
  const records = [];
  for (const project of catalogs.projects.projects) {
    records.push(discovery(project, 'project', projectSource(project)));
  }
  for (const script of catalogs.projects.packageScripts) {
    records.push(discovery(script, 'package-script', script.sourcePath));
  }
  for (const workflow of catalogs.projects.workflows) {
    records.push(discovery(workflow, 'ci-workflow', workflow.path));
  }
  for (const container of catalogs.projects.containers) {
    records.push(discovery(container, 'container', container.sourcePath));
  }
  for (const deployment of catalogs.projects.deployments) {
    records.push(discovery(deployment, 'deployment', deployment.sourcePath));
  }
  for (const requirement of catalogs.projects.requirements) {
    records.push(discovery(requirement, 'requirement', requirement.path));
  }
  for (const symbol of catalogs.typescriptSymbols.filter(
    (candidate) => candidate.exported && !candidate.testSource,
  )) {
    records.push(discovery(symbol, `typescript-${symbol.kind}`, symbol.sourcePath));
  }
  for (const symbol of catalogs.pythonSymbols.filter(
    (candidate) => candidate.public && !candidate.testSource,
  )) {
    records.push(discovery(symbol, `python-${symbol.kind}`, symbol.sourcePath));
  }
  for (const route of catalogs.expressRoutes) {
    records.push(discovery(route, 'api-endpoint', route.sourcePath));
  }
  for (const route of catalogs.fastapiRoutes) {
    records.push(discovery(route, 'api-endpoint', route.sourcePath));
  }
  for (const request of catalogs.frontendRequests) {
    records.push(discovery(request, 'frontend-api-consumer', request.sourcePath));
  }
  for (const model of catalogs.prismaModels) {
    records.push(discovery(model, 'data-model', model.sourcePath));
  }
  for (const migration of catalogs.migrations) {
    records.push(discovery(migration, 'database-migration', migration.sourcePath));
  }
  for (const configuration of catalogs.configuration) {
    const sourceRecord = configuration.sources?.[0];
    records.push(
      discovery(
        {
          ...configuration,
          lineStart: sourceRecord?.lineStart,
          lineEnd: sourceRecord?.lineEnd,
        },
        'configuration-key',
        sourceRecord?.path ?? 'docs/nhw/catalog/configuration-reads.jsonl',
      ),
    );
  }
  for (const testSurface of catalogs.tests) {
    records.push(discovery(testSurface, `${testSurface.type}-test`, testSurface.path));
  }

  const unique = new Map();
  for (const record of records) {
    if (!unique.has(record.id)) unique.set(record.id, record);
  }
  return [...unique.values()].sort((left, right) => left.id.localeCompare(right.id, 'en'));
}

function readableConfigurationPath(item) {
  return (
    item.pathType === 'file' &&
    !['metadata-only', 'generated-excluded'].includes(item.classification) &&
    /\.(?:[cm]?[jt]sx?|py|json|ya?ml|toml|txt|md|env|example)$/.test(item.path)
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function enrichConfigurationSources(repoRoot, inventory, catalogs) {
  const candidates = inventory.filter(readableConfigurationPath);
  for (const configuration of catalogs.configuration) {
    if ((configuration.sources ?? []).length > 0) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(configuration.name)}\\b`);
    const sources = [];
    for (const item of candidates) {
      const absolute = resolve(repoRoot, ...item.path.split('/'));
      let body = '';
      try {
        body = readFileSync(absolute, 'utf8');
      } catch {
        continue;
      }
      const lines = body.split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        if (pattern.test(lines[index])) {
          sources.push({
            path: item.path,
            lineStart: index + 1,
            lineEnd: index + 1,
          });
          break;
        }
      }
      if (sources.length >= 8) break;
    }
    configuration.sources = sources;
  }
  return catalogs;
}

export function writeKnowledgeRecords(repoRoot, records) {
  let changed = 0;
  for (const knowledge of records) {
    const absolute = resolve(repoRoot, ...knowledge.path.split('/'));
    if (writeText(absolute, renderKnowledgeUnit(knowledge.unit))) changed += 1;
  }
  return changed;
}

function walkMarkdown(directory) {
  if (!existsSync(directory)) return [];
  const paths = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...walkMarkdown(absolute));
    else if (entry.isFile() && entry.name.endsWith('.md')) paths.push(absolute);
  }
  return paths;
}

export function loadKnowledgeUnits(repoRoot, outputRoot) {
  const units = [];
  for (let index = 0; index <= 12; index += 1) {
    const prefix = String(index).padStart(2, '0');
    const directories = existsSync(outputRoot)
      ? readdirSync(outputRoot, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${prefix}-`))
          .map((entry) => join(outputRoot, entry.name))
      : [];
    for (const path of directories.flatMap(walkMarkdown).sort()) {
      const unitPath = relative(repoRoot, path).replaceAll('\\', '/');
      units.push(parseKnowledgeUnit(unitPath, readFileSync(path, 'utf8')));
    }
  }
  return units.sort((left, right) => left.id.localeCompare(right.id, 'en'));
}

function gitValue(repoRoot, args, fallback) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return fallback;
  }
}

export function writeKnowledgeOverview(outputRoot, inventoryHash) {
  return writeText(
    join(outputRoot, 'README.md'),
    `# ClinicOS NHW Machine Knowledge Base

This directory is the canonical dual-form knowledge base for ClinicOS.

- Resolve a concept by its stable lowercase dot-separated identifier in \`catalog/manifest.json\`.
- Read the referenced atomic Markdown unit for its definition, behavior, invariants, failures, and evidence.
- Traverse typed relations in \`graph/edges.jsonl\`; all endpoints are indexed in \`graph/nodes.jsonl\`.
- Verify claims against \`evidence/source-map.jsonl\` and source hashes.
- Inspect \`coverage/ledger.json\` before trusting completeness.
- Apply source precedence: executable runtime, schema and migrations, tests, deployment configuration, requirements, then narrative documentation.
- Treat \`observed\`, \`inferred\`, \`declared\`, \`drifted\`, and \`deprecated\` as distinct confidence states.
- Never retrieve configuration values from this knowledge base; only variable names and consumers are modeled.

Current authoring inventory hash: \`${inventoryHash}\`.
`,
  );
}

export function compileKnowledgeArtifacts({ repoRoot, outputRoot, inventory, catalogs }) {
  const units = loadKnowledgeUnits(repoRoot, outputRoot);
  const discoveries = buildDiscoveryRecords(catalogs).map((record) => {
    if (record.sourcePath !== 'docs/nhw/catalog/configuration-reads.jsonl') return record;
    const unit = units.find((candidate) => candidate.id === record.id);
    const firstSource = unit?.sources?.[0];
    return firstSource
      ? {
          ...record,
          sourcePath: firstSource.path,
          lineStart: Number(firstSource.line_start ?? 1),
          lineEnd: Number(firstSource.line_end ?? firstSource.line_start ?? 1),
        }
      : record;
  });
  const graph = compileGraph(units, discoveries);
  const sourceMap = buildSourceMap(inventory, units);
  const coverage = buildCoverage(inventory, discoveries, units);
  const cycles = detectCycles(graph);
  const orphans = findOrphans(graph);
  const redirects = {
    'context.patient-record': 'context.clinical-record',
    'project.ai-runtime': 'project.clinicos-ai-runtime',
  };
  const manifest = {
    schemaVersion: '1.0.0',
    systemId: 'system.clinicos',
    baseline: {
      branch: gitValue(repoRoot, ['branch', '--show-current'], 'working-tree'),
      commit: gitValue(repoRoot, ['rev-parse', 'HEAD'], 'working-tree'),
      inventoryHash: coverage.inventoryHash,
    },
    units: units.map(({ id, kind, path, status }) => ({ id, kind, path, status })),
    totals: {
      units: units.length,
      discoveries: discoveries.length,
      graphNodes: graph.nodes.length,
      graphEdges: graph.edges.length,
      cycles: cycles.length,
      orphans: orphans.length,
      documented: coverage.documented,
      metadataOnly: coverage.metadataOnly,
      generatedExcluded: coverage.generatedExcluded,
      unresolved: coverage.unresolved,
    },
  };

  writeJson(join(outputRoot, 'catalog', 'manifest.json'), manifest);
  writeJson(join(outputRoot, 'catalog', 'redirects.json'), {
    schemaVersion: '1.0.0',
    redirects,
  });
  writeJsonl(join(outputRoot, 'graph', 'nodes.jsonl'), graph.nodes);
  writeJsonl(join(outputRoot, 'graph', 'edges.jsonl'), graph.edges);
  writeJsonl(join(outputRoot, 'evidence', 'source-map.jsonl'), sourceMap);
  writeJson(join(outputRoot, 'coverage', 'ledger.json'), coverage);
  writeJson(join(outputRoot, 'reports', 'topology.json'), { cycles, orphans });

  return { manifest, units, discoveries, graph, sourceMap, coverage, cycles, orphans };
}
