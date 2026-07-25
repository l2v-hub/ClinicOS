import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const STABLE_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

const SEMANTIC_ROOTS = new Set([
  'api',
  'component',
  'config',
  'context',
  'data',
  'entity',
  'finding',
  'flow',
  'integration',
  'project',
  'system',
  'test',
  'value',
]);

/**
 * @typedef {object} KnowledgeNode
 * @property {string} id
 * @property {string} kind
 * @property {string} path
 * @property {'observed'|'inferred'|'declared'|'drifted'|'deprecated'} status
 */

/**
 * @typedef {object} KnowledgeEdge
 * @property {string} from
 * @property {string} type
 * @property {string} to
 * @property {string[]} evidence
 * @property {'observed'|'inferred'|'declared'} confidence
 */

/**
 * @typedef {object} SourceEvidence
 * @property {string} knowledgeId
 * @property {string} path
 * @property {string} symbol
 * @property {number} lineStart
 * @property {number} lineEnd
 * @property {string} fileHash
 * @property {'observed'|'inferred'|'declared'} confidence
 */

/**
 * @typedef {object} InventoryRecord
 * @property {string} path
 * @property {string} extension
 * @property {number} bytes
 * @property {string|null} sha256
 * @property {string} classification
 * @property {string} reason
 * @property {string} gitState
 */

/**
 * @typedef {object} DiscoveryRecord
 * @property {string} id
 * @property {string} kind
 * @property {string} sourcePath
 * @property {number} lineStart
 * @property {number} lineEnd
 */

/**
 * @typedef {object} CoverageLedger
 * @property {string} inventoryHash
 * @property {number} documented
 * @property {number} metadataOnly
 * @property {number} generatedExcluded
 * @property {number} unresolved
 * @property {object[]} records
 */

function slugSegment(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function normalizeId(value) {
  const segments = String(value)
    .trim()
    .split(/[./\\]+/)
    .map((segment) => slugSegment(segment))
    .filter(Boolean);

  if (segments.length === 0) {
    return '';
  }

  const firstWords = segments[0].split('-');
  if (firstWords.length > 1 && SEMANTIC_ROOTS.has(firstWords[0])) {
    segments.splice(0, 1, firstWords[0], firstWords.slice(1).join('-'));
  }

  return segments.join('.');
}

export function assertStableId(value) {
  if (!STABLE_ID_PATTERN.test(value)) {
    throw new Error(`Invalid stable identifier: ${value}`);
  }
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortValue(value[key])]),
    );
  }

  return value;
}

export function stableJson(value) {
  return `${JSON.stringify(sortValue(value))}\n`;
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function toPosixPath(value) {
  return String(value).replaceAll('\\', '/');
}

function writeIfChanged(path, content) {
  let current = null;
  try {
    current = readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (current === content) {
    return false;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return true;
}

export function writeJson(path, value) {
  return writeIfChanged(path, stableJson(value));
}

export function writeJsonl(path, rows) {
  const sorted = [...rows].sort((left, right) => {
    const leftKey = typeof left.id === 'string' ? left.id : stableJson(left);
    const rightKey = typeof right.id === 'string' ? right.id : stableJson(right);
    return leftKey.localeCompare(rightKey, 'en');
  });
  const content = sorted.map((row) => stableJson(row).trimEnd()).join('\n');
  return writeIfChanged(path, content ? `${content}\n` : '');
}
