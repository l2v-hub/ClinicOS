#!/usr/bin/env node

import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { writeJson, writeJsonl } from './lib/contracts.mjs';
import { buildInventory, inventoryHash } from './lib/inventory.mjs';
import { extractTypeScript } from './lib/typescript-extractor.mjs';

const STAGES = ['inventory', 'typescript'];

function outputDirectories(repoRoot, outputRoot) {
  return ['catalog', 'coverage', 'evidence', 'graph', 'reports']
    .map((name) => relative(repoRoot, join(outputRoot, name)))
    .filter((path) => path && !path.startsWith('..') && !isAbsolute(path));
}

async function generateInventory(repoRoot, outputRoot) {
  const coverageDirectory = join(outputRoot, 'coverage');
  mkdirSync(coverageDirectory, { recursive: true });
  const inventory = await buildInventory(repoRoot, {
    excludedDirectories: outputDirectories(repoRoot, outputRoot),
  });
  const exclusions = inventory
    .filter((record) => record.classification === 'generated-excluded')
    .map(({ path, classification, reason }) => ({ path, classification, reason }));

  writeJsonl(join(coverageDirectory, 'inventory.jsonl'), inventory);
  writeJson(join(coverageDirectory, 'exclusions.json'), {
    schemaVersion: '1.0.0',
    inventoryHash: inventoryHash(inventory),
    records: exclusions,
  });

  return {
    stage: 'inventory',
    inventoryPaths: inventory.length,
    inventoryHash: inventoryHash(inventory),
    exclusions: exclusions.length,
  };
}

async function generateTypeScript(repoRoot, outputRoot) {
  const catalogDirectory = join(outputRoot, 'catalog');
  mkdirSync(catalogDirectory, { recursive: true });
  const inventory = await buildInventory(repoRoot, {
    excludedDirectories: outputDirectories(repoRoot, outputRoot),
  });
  const paths = inventory
    .filter((record) => record.pathType === 'file')
    .filter((record) =>
      ['semantic-source', 'test-source', 'configuration-source', 'deployment-source'].includes(
        record.classification,
      ),
    )
    .filter((record) => /\.(?:[cm]?[jt]s|tsx|jsx)$/.test(record.path))
    .map((record) => record.path);
  const discovery = extractTypeScript(repoRoot, paths);
  const configurationRecords = discovery.configurationReads.map((name) => ({
    id: `config.discovered.${name.toLowerCase().replaceAll('_', '-')}`,
    name,
    runtimes: ['typescript'],
  }));

  writeJsonl(join(catalogDirectory, 'typescript-symbols.jsonl'), discovery.symbols);
  writeJsonl(join(catalogDirectory, 'express-routes.jsonl'), discovery.routes);
  writeJsonl(join(catalogDirectory, 'frontend-api-requests.jsonl'), discovery.frontendRequests);
  writeJsonl(join(catalogDirectory, 'configuration-reads.jsonl'), configurationRecords);

  return {
    stage: 'typescript',
    sourceFiles: paths.length,
    symbols: discovery.symbols.length,
    expressRoutes: discovery.routes.length,
    frontendRequests: discovery.frontendRequests.length,
    configurationReads: discovery.configurationReads.length,
  };
}

export async function generateKnowledgeBase(options = {}) {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const outputRoot = resolve(options.outputRoot ?? join(repoRoot, 'docs', 'nhw'));
  const stage = options.stage ?? 'inventory';

  if (!STAGES.includes(stage)) {
    throw new Error(`Unknown NHW stage '${stage}'. Allowed stages: ${STAGES.join(', ')}`);
  }

  if (stage === 'inventory') {
    return generateInventory(repoRoot, outputRoot);
  }
  if (stage === 'typescript') {
    return generateTypeScript(repoRoot, outputRoot);
  }

  throw new Error(`NHW stage '${stage}' has no implementation`);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--stage') {
      options.stage = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--output-root') {
      options.outputRoot = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }
  return options;
}

async function main() {
  const summary = await generateKnowledgeBase(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(`NHW generation failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
