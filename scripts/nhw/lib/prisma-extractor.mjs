import { sha256 } from './contracts.mjs';

function stripLineComment(line) {
  let quote = null;
  for (let index = 0; index < line.length - 1; index += 1) {
    const character = line[index];
    if ((character === '"' || character === "'") && line[index - 1] !== '\\') {
      quote = quote === character ? null : (quote ?? character);
    }
    if (!quote && character === '/' && line[index + 1] === '/') {
      return line.slice(0, index);
    }
  }
  return line;
}

function balancedArgument(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0) return null;
  let depth = 0;
  let quote = null;
  const argumentStart = start + marker.length;
  for (let index = argumentStart; index < text.length; index += 1) {
    const character = text[index];
    if ((character === '"' || character === "'") && text[index - 1] !== '\\') {
      quote = quote === character ? null : (quote ?? character);
    }
    if (quote) continue;
    if (character === '(') depth += 1;
    if (character === ')') {
      if (depth === 0) return text.slice(argumentStart, index).trim();
      depth -= 1;
    }
  }
  return null;
}

function commaList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
}

function namedList(argument, name) {
  const match = argument?.match(new RegExp(`${name}\\s*:\\s*\\[([^\\]]*)\\]`));
  return commaList(match?.[1]);
}

function namedValue(argument, name) {
  const match = argument?.match(new RegExp(`${name}\\s*:\\s*([^,\\s)]+|"[^"]*"|'[^']*')`));
  return match?.[1]?.replace(/^['"]|['"]$/g, '') ?? null;
}

function parseField(line, lineNumber, modelNames) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*(?:\[\]|\?)?)(.*)$/);
  if (!match) return null;
  const [, name, rawType, attributes] = match;
  const list = rawType.endsWith('[]');
  const nullable = rawType.endsWith('?');
  const type = rawType.replace(/\[\]|\?/g, '');
  const defaultArgument = balancedArgument(attributes, '@default(');
  const relationArgument = balancedArgument(attributes, '@relation(');
  const relation =
    modelNames.has(type) || relationArgument
      ? {
          target: type,
          cardinality: list ? 'many' : nullable ? 'optional-one' : 'required-one',
          fields: namedList(relationArgument, 'fields'),
          references: namedList(relationArgument, 'references'),
          onDelete: namedValue(relationArgument, 'onDelete'),
          onUpdate: namedValue(relationArgument, 'onUpdate'),
        }
      : null;
  return {
    name,
    type,
    rawType,
    list,
    nullable,
    id: /(^|\s)@id(?:\s|$)/.test(attributes),
    unique: /(^|\s)@unique(?:\s|$)/.test(attributes),
    default: defaultArgument,
    relation,
    lineStart: lineNumber,
  };
}

function parseBlockAttribute(line, lineNumber) {
  const match = line.match(/^@@(index|unique|id)\s*\(\s*\[([^\]]*)\](.*)\)$/);
  if (!match) return null;
  const [, kind, fieldsText, remainder] = match;
  const nameMatch = remainder.match(/(?:name|map)\s*:\s*"([^"]+)"/);
  return {
    kind,
    fields: commaList(fieldsText).map((field) => field.replace(/\(.*\)$/, '')),
    name: nameMatch?.[1] ?? null,
    lineStart: lineNumber,
  };
}

export function parsePrismaSchema(text, sourcePath) {
  const lines = text.split(/\r?\n/);
  const rawBlocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = stripLineComment(lines[index]).trim();
    const start = line.match(/^(model|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/);
    if (!start) continue;
    const block = {
      kind: start[1],
      name: start[2],
      lineStart: index + 1,
      lines: [],
    };
    for (index += 1; index < lines.length; index += 1) {
      const bodyLine = stripLineComment(lines[index]).trim();
      if (bodyLine === '}') {
        block.lineEnd = index + 1;
        break;
      }
      if (bodyLine) block.lines.push({ text: bodyLine, line: index + 1 });
    }
    rawBlocks.push(block);
  }

  const modelNames = new Set(
    rawBlocks.filter((block) => block.kind === 'model').map((block) => block.name),
  );
  const models = [];
  const enums = [];
  for (const block of rawBlocks) {
    if (block.kind === 'enum') {
      enums.push({
        id: `data.enum.${block.name.toLowerCase()}`,
        name: block.name,
        values: block.lines
          .map((line) => line.text.match(/^([A-Za-z_][A-Za-z0-9_]*)/)?.[1])
          .filter(Boolean),
        sourcePath,
        lineStart: block.lineStart,
        lineEnd: block.lineEnd,
      });
      continue;
    }
    const fields = [];
    const indexes = [];
    const uniqueConstraints = [];
    const primaryKeys = [];
    for (const line of block.lines) {
      if (line.text.startsWith('@@')) {
        const attribute = parseBlockAttribute(line.text, line.line);
        if (!attribute) continue;
        if (attribute.kind === 'index') indexes.push(attribute);
        if (attribute.kind === 'unique') uniqueConstraints.push(attribute);
        if (attribute.kind === 'id') primaryKeys.push(attribute);
      } else {
        const field = parseField(line.text, line.line, modelNames);
        if (field) fields.push(field);
      }
    }
    models.push({
      id: `data.model.${block.name.toLowerCase()}`,
      name: block.name,
      fields,
      indexes,
      uniqueConstraints,
      primaryKeys,
      sourcePath,
      lineStart: block.lineStart,
      lineEnd: block.lineEnd,
    });
  }
  return {
    sourcePath,
    models: models.sort((left, right) => left.name.localeCompare(right.name, 'en')),
    enums: enums.sort((left, right) => left.name.localeCompare(right.name, 'en')),
  };
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let singleQuote = false;
  let doubleQuote = false;
  let dollarTag = null;
  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    if (!singleQuote && !doubleQuote && character === '$') {
      const tag = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/)?.[0];
      if (tag) {
        if (dollarTag === tag) dollarTag = null;
        else if (!dollarTag) dollarTag = tag;
        current += tag;
        index += tag.length - 1;
        continue;
      }
    }
    if (!dollarTag && character === "'" && sql[index - 1] !== '\\' && !doubleQuote) {
      singleQuote = !singleQuote;
    } else if (!dollarTag && character === '"' && sql[index - 1] !== '\\' && !singleQuote) {
      doubleQuote = !doubleQuote;
    }
    if (character === ';' && !singleQuote && !doubleQuote && !dollarTag) {
      if (current.trim()) statements.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

function classifyStatement(statement) {
  const normalized = statement
    .replace(/--[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const patterns = [
    ['create-unique-index', /^CREATE\s+UNIQUE\s+INDEX\s+"?([^"\s]+)"?/i],
    ['create-index', /^CREATE\s+INDEX\s+"?([^"\s]+)"?/i],
    ['create-table', /^CREATE\s+TABLE\s+"?([^"\s(]+)"?/i],
    ['drop-table', /^DROP\s+TABLE\s+"?([^"\s;]+)"?/i],
    ['drop-column', /^ALTER\s+TABLE\s+"?([^"\s]+)"?\s+DROP\s+COLUMN/i],
    ['add-column', /^ALTER\s+TABLE\s+"?([^"\s]+)"?\s+ADD\s+COLUMN/i],
    ['add-constraint', /^ALTER\s+TABLE\s+"?([^"\s]+)"?\s+ADD\s+CONSTRAINT/i],
    ['data-update', /^UPDATE\s+"?([^"\s]+)"?/i],
  ];
  for (const [type, pattern] of patterns) {
    const match = normalized.match(pattern);
    if (match) return { type, target: match[1] };
  }
  return { type: 'sql-statement', target: null };
}

export function parseMigration(sql, migrationId) {
  const operations = splitSqlStatements(sql).map((statement, index) => ({
    order: index + 1,
    ...classifyStatement(statement),
    destructive: /^(?:DROP\s+TABLE|ALTER\s+TABLE[\s\S]*\sDROP\s+COLUMN)/i.test(
      statement.replace(/\s+/g, ' ').trim(),
    ),
    statementHash: sha256(statement),
  }));
  return {
    id: `data.migration.${migrationId.toLowerCase().replaceAll('_', '-')}`,
    migrationId,
    operations,
    destructive: operations.some((operation) => operation.destructive),
  };
}

export function buildMigrationLineage(schema, migrations) {
  const createdModels = new Set();
  for (const migration of migrations) {
    for (const operation of migration.operations) {
      if (operation.type === 'create-table' && operation.target) {
        createdModels.add(operation.target);
      }
    }
  }
  const currentModels = schema.models.map((model) => model.name).sort();
  return {
    currentModels,
    migrationIds: migrations.map((migration) => migration.migrationId).sort(),
    currentOnlyModels: currentModels.filter((model) => !createdModels.has(model)),
  };
}
