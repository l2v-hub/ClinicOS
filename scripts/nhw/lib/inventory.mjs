import { execFileSync } from 'node:child_process';
import { lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

import { sha256, stableJson, toPosixPath } from './contracts.mjs';

const BINARY_EXTENSIONS = new Set([
  '.7z',
  '.avi',
  '.docx',
  '.gif',
  '.gz',
  '.ico',
  '.jpeg',
  '.jpg',
  '.mov',
  '.mp3',
  '.mp4',
  '.pdf',
  '.png',
  '.tar',
  '.tgz',
  '.wav',
  '.webm',
  '.xlsx',
  '.zip',
]);

const APPLICATION_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.prisma',
  '.py',
  '.sql',
  '.ts',
  '.tsx',
]);

const CONFIGURATION_EXTENSIONS = new Set(['.json', '.toml', '.yaml', '.yml']);

const EXCLUDED_DIRECTORY_NAMES = new Set([
  '.git',
  '.playwright-mcp',
  '.worktrees',
  '__pycache__',
  'dist',
  'dist-ssr',
  'node_modules',
]);

function normalizePath(value) {
  return toPosixPath(value).replace(/^\.\/+/, '');
}

function hasSegment(path, segment) {
  return path.split('/').includes(segment);
}

export function classifyPath(relativePath) {
  const path = normalizePath(relativePath).replace(/\/+$/, '');
  const lower = path.toLowerCase();
  const extension = extname(lower);

  if (
    hasSegment(lower, '.git') ||
    hasSegment(lower, 'node_modules') ||
    hasSegment(lower, '.worktrees') ||
    hasSegment(lower, '.playwright-mcp') ||
    lower === '.claude/worktrees' ||
    lower.startsWith('.claude/worktrees/') ||
    lower === 'agent-team/.runtime' ||
    lower.startsWith('agent-team/.runtime/') ||
    lower === 'agent-team/.worktrees' ||
    lower.startsWith('agent-team/.worktrees/') ||
    hasSegment(lower, '__pycache__') ||
    hasSegment(lower, 'dist') ||
    hasSegment(lower, 'dist-ssr') ||
    hasSegment(lower, 'playwright-report')
  ) {
    return {
      classification: 'generated-excluded',
      reason: 'generated-or-ephemeral-directory',
    };
  }

  if (
    lower.startsWith('artifacts/') ||
    lower.startsWith('qa-evidence/') ||
    BINARY_EXTENSIONS.has(extension) ||
    lower.endsWith('.log')
  ) {
    return {
      classification: 'metadata-only',
      reason: 'authored-or-runtime-artifact',
    };
  }

  if (lower.includes('/migrations/') && extension === '.sql') {
    return {
      classification: 'semantic-source',
      reason: 'database-migration',
    };
  }

  if (
    /(^|\/)(test(s)?|__tests__)(\/|$)/.test(lower) ||
    /(^|[.-])(test|spec)\.(?:[cm]?[jt]sx?|py)$/.test(lower) ||
    /(^|\/)test_[^/]+\.py$/.test(lower) ||
    lower.startsWith('e2e/')
  ) {
    return {
      classification: 'test-source',
      reason: 'automated-test',
    };
  }

  if (
    lower.startsWith('.github/workflows/') ||
    lower.endsWith('/dockerfile') ||
    lower === 'dockerfile' ||
    lower.includes('docker-compose') ||
    lower.endsWith('railway.json') ||
    lower.endsWith('vercel.json') ||
    extension === '.ps1' ||
    extension === '.sh'
  ) {
    return {
      classification: 'deployment-source',
      reason: 'delivery-or-operations',
    };
  }

  if (
    lower === 'package.json' ||
    lower === 'package-lock.json' ||
    lower.endsWith('/package.json') ||
    lower.endsWith('/requirements.txt') ||
    lower.endsWith('/pyproject.toml') ||
    lower.endsWith('/tsconfig.json') ||
    lower.includes('tsconfig.') ||
    lower.startsWith('.env') ||
    lower.includes('/.env') ||
    CONFIGURATION_EXTENSIONS.has(extension)
  ) {
    return {
      classification: 'configuration-source',
      reason: 'configuration-or-manifest',
    };
  }

  if (
    lower.startsWith('docs/') ||
    lower.startsWith('requirements/') ||
    lower.startsWith('specs/') ||
    extension === '.md' ||
    extension === '.txt'
  ) {
    return {
      classification: 'narrative-source',
      reason: 'documentation-or-requirement',
    };
  }

  if (APPLICATION_EXTENSIONS.has(extension)) {
    return {
      classification: 'semantic-source',
      reason: 'application-source',
    };
  }

  return {
    classification: 'metadata-only',
    reason: 'unclassified-repository-artifact',
  };
}

function parseGitStates(repoRoot) {
  let output = '';
  try {
    output = execFileSync(
      'git',
      [
        'status',
        '--porcelain=v1',
        '-z',
        '--untracked-files=all',
        '--ignored=matching',
        '--no-renames',
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
  } catch {
    return new Map();
  }

  const states = new Map();
  for (const entry of output.split('\0').filter(Boolean)) {
    const code = entry.slice(0, 2);
    const path = normalizePath(entry.slice(3)).replace(/\/+$/, '');
    const state = code === '??' ? 'untracked' : code === '!!' ? 'ignored' : 'tracked-modified';
    states.set(path, state);
  }
  return states;
}

function gitStateFor(path, states) {
  const normalized = path.replace(/\/+$/, '');
  if (states.has(normalized)) {
    return states.get(normalized);
  }
  const parent = [...states.entries()]
    .filter(([candidate]) => normalized.startsWith(`${candidate.replace(/\/+$/, '')}/`))
    .sort(([left], [right]) => right.length - left.length)[0];
  return parent?.[1] ?? 'tracked-clean';
}

function shouldExcludeDirectory(path, explicitExcludedDirectories) {
  const normalized = path.replace(/\/+$/, '');
  const name = normalized.split('/').at(-1);
  return (
    EXCLUDED_DIRECTORY_NAMES.has(name) ||
    normalized === '.claude/worktrees' ||
    normalized === 'agent-team/.runtime' ||
    normalized === 'agent-team/.worktrees' ||
    explicitExcludedDirectories.has(normalized)
  );
}

export async function buildInventory(repoRoot, options = {}) {
  const absoluteRoot = resolve(repoRoot);
  const explicitExcludedDirectories = new Set(
    (options.excludedDirectories ?? []).map((path) => normalizePath(path).replace(/\/+$/, '')),
  );
  const gitStates = parseGitStates(absoluteRoot);
  const records = [];

  function visit(absoluteDirectory, relativeDirectory = '') {
    const entries = readdirSync(absoluteDirectory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name, 'en'),
    );

    for (const entry of entries) {
      const relativePath = normalizePath(
        relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name,
      );
      const absolutePath = resolve(absoluteDirectory, entry.name);
      const stats = lstatSync(absolutePath);

      if (entry.isDirectory()) {
        if (shouldExcludeDirectory(relativePath, explicitExcludedDirectories)) {
          const classified = classifyPath(relativePath);
          records.push({
            path: `${relativePath}/`,
            pathType: 'directory',
            extension: '',
            bytes: 0,
            sha256: null,
            classification: 'generated-excluded',
            reason: explicitExcludedDirectories.has(relativePath)
              ? 'nhw-generated-output'
              : classified.reason,
            gitState: gitStateFor(relativePath, gitStates),
          });
        } else {
          visit(absolutePath, relativePath);
        }
        continue;
      }

      const classified = classifyPath(relativePath);
      const pathType = entry.isSymbolicLink() ? 'symlink' : 'file';
      const bytes =
        pathType === 'symlink'
          ? Buffer.from(readlinkSync(absolutePath), 'utf8')
          : readFileSync(absolutePath);
      records.push({
        path: relativePath,
        pathType,
        extension: extname(relativePath).toLowerCase(),
        bytes: stats.size,
        sha256: sha256(bytes),
        ...classified,
        gitState: gitStateFor(relativePath, gitStates),
      });
    }
  }

  visit(absoluteRoot);
  return records.sort((left, right) => left.path.localeCompare(right.path, 'en'));
}

export function inventoryHash(records) {
  const canonicalRecords = records
    .map(({ gitState: _gitState, ...record }) => record)
    .sort((left, right) => stableJson(left).localeCompare(stableJson(right), 'en'));
  return sha256(stableJson(canonicalRecords));
}
