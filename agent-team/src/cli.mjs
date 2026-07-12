#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './core/config.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const config = await loadConfig({ repoRoot });
const command = process.argv[2];
const modules = { doctor: './commands/doctor-entry.mjs', once: './commands/once.mjs', start: './commands/start.mjs', status: './commands/status.mjs', stop: './commands/stop.mjs', loop: './commands/start.mjs' };
if (!modules[command]) { console.error(JSON.stringify({ ok: false, error: `unknown command: ${command}` })); process.exit(2); }
const handler = await import(modules[command]);
const result = await handler.run({ config, repoRoot, mode: command });
console.log(JSON.stringify(result));
if (result.ok === false) process.exitCode = 1;
