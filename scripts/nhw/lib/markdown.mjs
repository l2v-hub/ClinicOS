import { assertStableId, STABLE_ID_PATTERN } from './contracts.mjs';

export const REQUIRED_HEADINGS = [
  'Question Answered',
  'Canonical Definition',
  'Inputs',
  'Outputs',
  'Dependencies',
  'Side Effects',
  'Consumers',
  'Invariants',
  'Failure Modes',
  'Evidence',
  'Related Knowledge',
];

const ALLOWED_FIELDS = new Set([
  'id',
  'kind',
  'title',
  'status',
  'summary',
  'bounded_contexts',
  'sources',
  'relations',
  'tags',
  'last_verified',
  'inference_rule',
]);
const STATUSES = new Set(['observed', 'inferred', 'declared', 'drifted', 'deprecated']);

function contractError(code, message, path) {
  const error = new Error(message);
  error.code = code;
  error.path = path;
  return error;
}

function parseScalar(value, path, lineNumber) {
  const trimmed = value.trim();
  if (/^(?:&|\*|!|<<:)/.test(trimmed)) {
    throw contractError(
      'NHW_UNSAFE_FRONTMATTER',
      `Unsafe YAML construct at ${path}:${lineNumber}`,
      path,
    );
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    if (trimmed.startsWith('"')) return JSON.parse(trimmed);
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  if (trimmed === '[]') return [];
  if (trimmed === '{}') return {};
  return trimmed;
}

function splitKeyValue(text, path, lineNumber) {
  const separator = text.indexOf(':');
  if (separator < 1) {
    throw contractError(
      'NHW_INVALID_FRONTMATTER',
      `Expected key/value at ${path}:${lineNumber}`,
      path,
    );
  }
  return [text.slice(0, separator).trim(), text.slice(separator + 1).trim()];
}

function setUnique(target, key, value, path, lineNumber) {
  if (Object.hasOwn(target, key)) {
    throw contractError(
      'NHW_DUPLICATE_FRONTMATTER_KEY',
      `Duplicate frontmatter key '${key}' at ${path}:${lineNumber}`,
      path,
    );
  }
  target[key] = value;
}

function parseFrontmatter(path, lines) {
  const result = {};
  let index = 0;
  while (index < lines.length) {
    const raw = lines[index];
    if (!raw.trim()) {
      index += 1;
      continue;
    }
    if (/^\s/.test(raw)) {
      throw contractError(
        'NHW_INVALID_FRONTMATTER',
        `Unexpected indentation at ${path}:${index + 2}`,
        path,
      );
    }
    const [key, value] = splitKeyValue(raw, path, index + 2);
    if (!ALLOWED_FIELDS.has(key)) {
      throw contractError(
        'NHW_UNKNOWN_FRONTMATTER_FIELD',
        `Unknown frontmatter field '${key}' in ${path}`,
        path,
      );
    }
    if (value) {
      setUnique(result, key, parseScalar(value, path, index + 2), path, index + 2);
      index += 1;
      continue;
    }

    const nested = [];
    const object = {};
    let mode = null;
    index += 1;
    while (index < lines.length && (/^\s/.test(lines[index]) || !lines[index].trim())) {
      const child = lines[index];
      if (!child.trim()) {
        index += 1;
        continue;
      }
      const arrayItem = child.match(/^  -(?:\s+(.*))?$/);
      if (arrayItem) {
        if (mode === 'object') {
          throw contractError(
            'NHW_INVALID_FRONTMATTER',
            `Mixed mapping and array for '${key}' in ${path}`,
            path,
          );
        }
        mode = 'array';
        const itemText = arrayItem[1] ?? '';
        if (!itemText) {
          nested.push({});
        } else if (/^[a-z_][a-z0-9_]*\s*:/.test(itemText)) {
          const [itemKey, itemValue] = splitKeyValue(itemText, path, index + 2);
          nested.push({ [itemKey]: parseScalar(itemValue, path, index + 2) });
        } else {
          nested.push(parseScalar(itemText, path, index + 2));
        }
        index += 1;
        continue;
      }
      const objectItem = child.match(/^(  |    )([a-z_][a-z0-9_]*):\s*(.*)$/);
      if (!objectItem) {
        throw contractError(
          'NHW_INVALID_FRONTMATTER',
          `Invalid nested value at ${path}:${index + 2}`,
          path,
        );
      }
      const [, indentation, itemKey, itemValue] = objectItem;
      if (indentation.length === 4) {
        if (mode !== 'array' || nested.length === 0 || typeof nested.at(-1) !== 'object') {
          throw contractError(
            'NHW_INVALID_FRONTMATTER',
            `Array-object property without item at ${path}:${index + 2}`,
            path,
          );
        }
        setUnique(nested.at(-1), itemKey, parseScalar(itemValue, path, index + 2), path, index + 2);
      } else {
        if (mode === 'array') {
          throw contractError(
            'NHW_INVALID_FRONTMATTER',
            `Mixed array and mapping for '${key}' in ${path}`,
            path,
          );
        }
        mode = 'object';
        setUnique(object, itemKey, parseScalar(itemValue, path, index + 2), path, index + 2);
      }
      index += 1;
    }
    setUnique(result, key, mode === 'array' ? nested : object, path, index + 1);
  }
  return result;
}

function validateUnit(unit) {
  const requiredFields = ['id', 'kind', 'title', 'status', 'summary', 'sources', 'lastVerified'];
  for (const field of requiredFields) {
    if (unit[field] === undefined || unit[field] === '') {
      throw contractError(
        'NHW_MISSING_FRONTMATTER_FIELD',
        `Missing required field '${field}' in ${unit.path}`,
        unit.path,
      );
    }
  }
  try {
    assertStableId(unit.id);
  } catch {
    throw contractError('NHW_INVALID_ID', `Invalid knowledge identifier '${unit.id}'`, unit.path);
  }
  if (!STATUSES.has(unit.status)) {
    throw contractError('NHW_INVALID_STATUS', `Invalid status '${unit.status}'`, unit.path);
  }
  if (unit.status === 'inferred' && !unit.inferenceRule) {
    throw contractError(
      'NHW_MISSING_INFERENCE_RULE',
      `Inferred unit '${unit.id}' requires inference_rule`,
      unit.path,
    );
  }
  for (const relation of unit.relations ?? []) {
    if (!STABLE_ID_PATTERN.test(relation.target ?? '')) {
      throw contractError(
        'NHW_INVALID_RELATION_TARGET',
        `Invalid relation target '${relation.target}' in ${unit.path}`,
        unit.path,
      );
    }
  }
  for (const heading of REQUIRED_HEADINGS) {
    if (!Object.hasOwn(unit.sections ?? {}, heading) || !unit.sections[heading].trim()) {
      throw contractError(
        'NHW_MISSING_HEADING',
        `Missing required heading '${heading}' in ${unit.path}`,
        unit.path,
      );
    }
  }
}

export function parseKnowledgeUnit(path, text) {
  const normalized = text.replaceAll('\r\n', '\n');
  if (!normalized.startsWith('---\n')) {
    throw contractError('NHW_INVALID_FRONTMATTER', `Missing frontmatter in ${path}`, path);
  }
  const closing = normalized.indexOf('\n---\n', 4);
  if (closing < 0) {
    throw contractError('NHW_INVALID_FRONTMATTER', `Unclosed frontmatter in ${path}`, path);
  }
  const frontmatter = parseFrontmatter(path, normalized.slice(4, closing).split('\n'));
  const body = normalized.slice(closing + 5);
  const sections = {};
  let current = null;
  for (const line of body.split('\n')) {
    const heading = line.match(/^## (.+)$/)?.[1];
    if (heading) {
      if (Object.hasOwn(sections, heading)) {
        throw contractError(
          'NHW_DUPLICATE_HEADING',
          `Duplicate heading '${heading}' in ${path}`,
          path,
        );
      }
      current = heading;
      sections[current] = '';
      continue;
    }
    if (current) sections[current] += `${line}\n`;
  }
  for (const key of Object.keys(sections)) sections[key] = sections[key].trim();

  const unit = {
    path,
    id: frontmatter.id,
    kind: frontmatter.kind,
    title: frontmatter.title,
    status: frontmatter.status,
    summary: frontmatter.summary,
    boundedContexts: frontmatter.bounded_contexts ?? [],
    sources: frontmatter.sources ?? [],
    relations: frontmatter.relations ?? [],
    tags: frontmatter.tags ?? [],
    lastVerified: frontmatter.last_verified,
    inferenceRule: frontmatter.inference_rule,
    sections,
  };
  validateUnit(unit);
  return unit;
}

function scalar(value) {
  return JSON.stringify(String(value));
}

function renderField(lines, key, value) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${key}: []`);
      return;
    }
    lines.push(`${key}:`);
    for (const item of value) {
      if (item && typeof item === 'object') {
        const entries = Object.entries(item).filter(([, child]) => child !== undefined);
        if (entries.length === 0) {
          lines.push('  -');
          continue;
        }
        const [[firstKey, firstValue], ...rest] = entries;
        lines.push(`  - ${firstKey}: ${scalar(firstValue)}`);
        for (const [childKey, childValue] of rest) {
          lines.push(`    ${childKey}: ${scalar(childValue)}`);
        }
      } else {
        lines.push(`  - ${scalar(item)}`);
      }
    }
    return;
  }
  if (value && typeof value === 'object') {
    lines.push(`${key}:`);
    for (const [childKey, childValue] of Object.entries(value)) {
      lines.push(`  ${childKey}: ${scalar(childValue)}`);
    }
    return;
  }
  lines.push(`${key}: ${scalar(value)}`);
}

export function renderKnowledgeUnit(unit) {
  validateUnit(unit);
  const lines = ['---'];
  renderField(lines, 'id', unit.id);
  renderField(lines, 'kind', unit.kind);
  renderField(lines, 'title', unit.title);
  renderField(lines, 'status', unit.status);
  renderField(lines, 'summary', unit.summary);
  renderField(lines, 'bounded_contexts', unit.boundedContexts ?? []);
  renderField(lines, 'sources', unit.sources ?? []);
  renderField(lines, 'relations', unit.relations ?? []);
  renderField(lines, 'tags', unit.tags ?? []);
  renderField(lines, 'last_verified', unit.lastVerified);
  if (unit.inferenceRule) renderField(lines, 'inference_rule', unit.inferenceRule);
  lines.push('---', '');
  const extras = Object.keys(unit.sections).filter(
    (heading) => !REQUIRED_HEADINGS.includes(heading),
  );
  for (const heading of [...REQUIRED_HEADINGS, ...extras.sort()]) {
    lines.push(`## ${heading}`, '', unit.sections[heading].trim(), '');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

export function validateKnowledgeUnits(units) {
  const errors = [];
  const identifiers = new Map();
  const definitions = new Map();
  for (const unit of units) {
    try {
      validateUnit(unit);
    } catch (error) {
      errors.push({
        code: error.code ?? 'NHW_INVALID_UNIT',
        message: error.message,
        path: unit.path,
        knowledgeId: unit.id,
      });
    }
    if (identifiers.has(unit.id)) {
      errors.push({
        code: 'NHW_DUPLICATE_ID',
        message: `Duplicate knowledge identifier '${unit.id}'`,
        path: unit.path,
        knowledgeId: unit.id,
      });
    } else {
      identifiers.set(unit.id, unit.path);
    }
    const definition = unit.sections?.['Canonical Definition']?.trim();
    if (definition && definition !== 'None observed') {
      if (definitions.has(definition)) {
        errors.push({
          code: 'NHW_DUPLICATE_DEFINITION',
          message: `Canonical definition duplicates '${definitions.get(definition)}'`,
          path: unit.path,
          knowledgeId: unit.id,
        });
      } else {
        definitions.set(definition, unit.id);
      }
    }
  }
  return errors;
}
