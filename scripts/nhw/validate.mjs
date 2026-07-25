#!/usr/bin/env node

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateKnowledgeBase } from './lib/validator.mjs';

function parseArgs(argv) {
  const options = {};
  for (const argument of argv) {
    if (argument === '--allow-unresolved') options.allowUnresolved = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

async function main() {
  const result = await validateKnowledgeBase({
    repoRoot: process.cwd(),
    ...parseArgs(process.argv.slice(2)),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(`NHW validation failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
