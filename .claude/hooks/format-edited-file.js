#!/usr/bin/env node
'use strict';
// PostToolUse hook — auto-format the file just written/edited with Prettier.
// Fixes CRLF/formatting drift at the source (see clinicos-restyle history: patient-list
// once got corrupted by CRLF noise). Uses the Prettier Node API (not the CLI) so it is
// immune to the npx->npm shell rewrite and to Windows .cmd/.ps1 binary resolution.
//
// Protocol: reads the tool event JSON on stdin ({tool_name, tool_input:{file_path}}).
// ABSOLUTE fail-open: on ANY problem it exits 0 silently and never blocks the edit.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MUTATING = new Set(['Write', 'Edit', 'MultiEdit']);
// Extensions Prettier should touch here (JSON handled too — package.json etc. stay tidy).
const EXT_OK = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.md',
  '.html',
]);

function loadPrettier() {
  try {
    return require(path.join(ROOT, 'node_modules', 'prettier'));
  } catch (_e) {
    return null; // not installed yet -> no-op
  }
}

async function main() {
  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch (_e) {
    return;
  }
  let evt;
  try {
    evt = JSON.parse(raw || '{}');
  } catch (_e) {
    return;
  }

  const tool = evt.tool_name || evt.toolName || '';
  if (!MUTATING.has(tool)) return;

  const input = evt.tool_input || evt.toolInput || {};
  const file = input.file_path || input.path;
  if (typeof file !== 'string' || !file) return;
  if (!EXT_OK.has(path.extname(file).toLowerCase())) return;
  if (!fs.existsSync(file)) return;

  const prettier = loadPrettier();
  if (!prettier) return;

  try {
    const info = await prettier.getFileInfo(file, { resolveConfig: true });
    if (!info || info.ignored || !info.inferredParser) return;
    const source = fs.readFileSync(file, 'utf8');
    const options = (await prettier.resolveConfig(file)) || {};
    const formatted = await prettier.format(source, { ...options, filepath: file });
    if (formatted !== source) fs.writeFileSync(file, formatted, 'utf8');
  } catch (_e) {
    // Unparseable / mid-edit file — leave it untouched.
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(0));
