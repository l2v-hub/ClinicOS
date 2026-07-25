import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';

import ts from 'typescript';

import { normalizeId, toPosixPath } from './contracts.mjs';

const HTTP_METHODS = new Set(['delete', 'get', 'patch', 'post', 'put']);

function sourceLine(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function sourceEndLine(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
}

function walk(node, visitor) {
  visitor(node);
  node.forEachChild((child) => walk(child, visitor));
}

function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));
}

function projectFor(path) {
  return path.split('/')[0] || 'repository';
}

function isTestPath(path) {
  return (
    /(^|\/)(?:__tests__|tests?)(\/|$)/.test(path) ||
    /(?:^|[.-])(?:test|spec)\.(?:[cm]?[jt]sx?)$/.test(path)
  );
}

function symbolId(path, name) {
  const project = projectFor(path);
  const pathWithoutExtension = path.slice(0, -extname(path).length);
  return normalizeId(`component/${project}/${pathWithoutExtension}/${name}`);
}

function routeId(method, path, index) {
  const slug = path
    .replace(/:[A-Za-z0-9_]+/g, 'by-param')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim();
  return normalizeId(`api/backend/${method} ${slug || 'root'} ${index}`);
}

function requestId(path, line, index) {
  return normalizeId(`api-consumer/frontend/${path}/${line}/${index}`);
}

function moduleCandidatePaths(importerPath, moduleSpecifier) {
  if (!moduleSpecifier.startsWith('.')) {
    return [];
  }
  const base = resolve(dirname(importerPath), moduleSpecifier);
  const withoutRuntimeExtension = base.replace(/\.(?:c|m)?js$/i, '');
  return [
    base,
    withoutRuntimeExtension,
    `${withoutRuntimeExtension}.ts`,
    `${withoutRuntimeExtension}.tsx`,
    `${withoutRuntimeExtension}.mts`,
    `${withoutRuntimeExtension}.mjs`,
    resolve(withoutRuntimeExtension, 'index.ts'),
    resolve(withoutRuntimeExtension, 'index.tsx'),
  ];
}

function resolveImportedPath(importerPath, moduleSpecifier, absoluteToRelative) {
  for (const candidate of moduleCandidatePaths(importerPath, moduleSpecifier)) {
    const key = resolve(candidate).toLowerCase();
    if (absoluteToRelative.has(key)) {
      return absoluteToRelative.get(key);
    }
  }
  return null;
}

function importRecords(sourceFile, sourcePath, absolutePath, absoluteToRelative) {
  const records = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const moduleSpecifier = statement.moduleSpecifier.text;
    const targetPath = resolveImportedPath(absolutePath, moduleSpecifier, absoluteToRelative);
    const clause = statement.importClause;
    if (!clause) {
      records.push({
        sourcePath,
        targetPath,
        moduleSpecifier,
        localName: null,
        importedName: null,
        kind: 'side-effect',
        lineStart: sourceLine(sourceFile, statement),
      });
      continue;
    }
    if (clause.name) {
      records.push({
        sourcePath,
        targetPath,
        moduleSpecifier,
        localName: clause.name.text,
        importedName: 'default',
        kind: clause.isTypeOnly ? 'type' : 'value',
        lineStart: sourceLine(sourceFile, statement),
      });
    }
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        records.push({
          sourcePath,
          targetPath,
          moduleSpecifier,
          localName: element.name.text,
          importedName: element.propertyName?.text ?? element.name.text,
          kind: clause.isTypeOnly || element.isTypeOnly ? 'type' : 'value',
          lineStart: sourceLine(sourceFile, element),
        });
      }
    } else if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      records.push({
        sourcePath,
        targetPath,
        moduleSpecifier,
        localName: clause.namedBindings.name.text,
        importedName: '*',
        kind: clause.isTypeOnly ? 'type' : 'value',
        lineStart: sourceLine(sourceFile, clause.namedBindings),
      });
    }
  }
  return records;
}

function declarationKind(statement, name) {
  if (ts.isInterfaceDeclaration(statement)) return 'interface';
  if (ts.isTypeAliasDeclaration(statement)) return 'type-alias';
  if (ts.isClassDeclaration(statement)) return 'class';
  if (ts.isFunctionDeclaration(statement)) {
    return /^[A-Z]/.test(name) ? 'react-component' : 'function';
  }
  if (ts.isEnumDeclaration(statement)) return 'enum';
  return 'constant';
}

function declaredSymbols(sourceFile, sourcePath, testSource) {
  const symbols = [];
  for (const statement of sourceFile.statements) {
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      const name = statement.name?.text;
      if (!name) continue;
      symbols.push({
        id: symbolId(sourcePath, name),
        name,
        kind: declarationKind(statement, name),
        sourcePath,
        lineStart: sourceLine(sourceFile, statement),
        lineEnd: sourceEndLine(sourceFile, statement),
        exported:
          hasModifier(statement, ts.SyntaxKind.ExportKeyword) ||
          hasModifier(statement, ts.SyntaxKind.DefaultKeyword),
        defaultExport: hasModifier(statement, ts.SyntaxKind.DefaultKeyword),
        testSource,
        consumers: [],
      });
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      const exported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const name = declaration.name.text;
        const initializer = declaration.initializer;
        const isFunction =
          initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer));
        const kind =
          isFunction && /^[A-Z]/.test(name)
            ? 'react-component'
            : isFunction
              ? 'function'
              : 'constant';
        symbols.push({
          id: symbolId(sourcePath, name),
          name,
          kind,
          sourcePath,
          lineStart: sourceLine(sourceFile, declaration),
          lineEnd: sourceEndLine(sourceFile, declaration),
          exported,
          defaultExport: false,
          testSource,
          consumers: [],
        });
      }
    }
  }

  for (const statement of sourceFile.statements) {
    if (
      ts.isExportAssignment(statement) &&
      !statement.isExportEquals &&
      ts.isIdentifier(statement.expression)
    ) {
      const symbol = symbols.find((candidate) => candidate.name === statement.expression.text);
      if (symbol) {
        symbol.exported = true;
        symbol.defaultExport = true;
      }
    }
    if (
      ts.isExportDeclaration(statement) &&
      !statement.moduleSpecifier &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        const localName = element.propertyName?.text ?? element.name.text;
        const symbol = symbols.find((candidate) => candidate.name === localName);
        if (symbol) symbol.exported = true;
      }
    }
  }
  return symbols;
}

function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function joinPaths(prefix, path) {
  const parts = [prefix, path].filter(Boolean).join('/').replace(/\/+/g, '/');
  if (!parts) return '/';
  return parts.startsWith('/') ? parts : `/${parts}`;
}

function nodeLabel(node, sourceFile) {
  if (ts.isIdentifier(node)) return node.text;
  if (
    ts.isCallExpression(node) &&
    (ts.isIdentifier(node.expression) || ts.isPropertyAccessExpression(node.expression))
  ) {
    return node.expression.getText(sourceFile);
  }
  return node.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 120);
}

function outerPropertyText(node, sourceFile) {
  if (!ts.isPropertyAccessExpression(node)) return null;
  if (ts.isPropertyAccessExpression(node.parent) && node.parent.expression === node) {
    return null;
  }
  return node.getText(sourceFile);
}

function handlerBehavior(handler, sourceFile) {
  const responseStatuses = new Set();
  const persistenceCalls = new Set();
  const requestReads = new Set();
  const sideEffects = new Set();
  let returnsJson = false;

  walk(handler, (node) => {
    const propertyText = outerPropertyText(node, sourceFile);
    if (
      propertyText &&
      /^req\.(?:body|file|files|headers|params|query)(?:\.|$)/.test(propertyText)
    ) {
      requestReads.add(propertyText);
    }

    if (!ts.isCallExpression(node)) return;
    const expressionText = node.expression.getText(sourceFile);
    if (expressionText === 'res.json' || expressionText.endsWith('.json')) {
      returnsJson = true;
    }
    if (
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'status' &&
      node.arguments[0] &&
      ts.isNumericLiteral(node.arguments[0])
    ) {
      responseStatuses.add(Number(node.arguments[0].text));
    }
    if (/^prisma\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/.test(expressionText)) {
      persistenceCalls.add(expressionText);
    }
    if (
      expressionText === 'fetch' ||
      expressionText === 'setInterval' ||
      expressionText === 'setTimeout' ||
      expressionText.endsWith('.startWorker') ||
      expressionText.endsWith('.createTask')
    ) {
      sideEffects.add(expressionText);
    }
  });

  if (returnsJson && responseStatuses.size === 0) {
    responseStatuses.add(200);
  }

  return {
    responseStatuses: [...responseStatuses].sort((left, right) => left - right),
    persistenceCalls: [...persistenceCalls].sort(),
    requestReads: [...requestReads].sort(),
    sideEffects: [...sideEffects].sort(),
  };
}

function exportedRouterNames(sourceFile) {
  const names = new Map();
  for (const statement of sourceFile.statements) {
    if (
      ts.isExportAssignment(statement) &&
      !statement.isExportEquals &&
      ts.isIdentifier(statement.expression)
    ) {
      if (!names.has(statement.expression.text)) names.set(statement.expression.text, []);
      names.get(statement.expression.text).push('default');
    }
    if (ts.isVariableStatement(statement) && hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          if (!names.has(declaration.name.text)) names.set(declaration.name.text, []);
          names.get(declaration.name.text).push(declaration.name.text);
        }
      }
    }
    if (
      ts.isExportDeclaration(statement) &&
      !statement.moduleSpecifier &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        const localName = element.propertyName?.text ?? element.name.text;
        if (!names.has(localName)) names.set(localName, []);
        names.get(localName).push(element.name.text);
      }
    }
  }
  return names;
}

function collectMounts(files, imports) {
  const mounts = new Map();
  const importsByFile = new Map();
  for (const record of imports) {
    if (!importsByFile.has(record.sourcePath)) importsByFile.set(record.sourcePath, []);
    importsByFile.get(record.sourcePath).push(record);
  }

  for (const file of files) {
    walk(file.sourceFile, (node) => {
      if (
        !ts.isCallExpression(node) ||
        !ts.isPropertyAccessExpression(node.expression) ||
        node.expression.name.text !== 'use' ||
        node.arguments.length < 2
      ) {
        return;
      }
      const prefix = literalText(node.arguments[0]);
      const routerArgument = node.arguments[1];
      if (prefix === null || !ts.isIdentifier(routerArgument)) return;
      const imported = (importsByFile.get(file.path) ?? []).find(
        (record) => record.localName === routerArgument.text,
      );
      if (!imported?.targetPath) return;
      const key = `${imported.targetPath}::${imported.importedName}`;
      if (!mounts.has(key)) mounts.set(key, []);
      mounts.get(key).push(prefix);
    });
  }
  return mounts;
}

function collectRoutes(files, mounts) {
  const routes = [];
  for (const file of files.filter((candidate) => !candidate.testSource)) {
    const routerExports = exportedRouterNames(file.sourceFile);
    walk(file.sourceFile, (node) => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
        return;
      }
      const method = node.expression.name.text.toLowerCase();
      if (!HTTP_METHODS.has(method) || node.arguments.length < 2) return;
      const localPath = literalText(node.arguments[0]);
      if (localPath === null) return;
      const receiver = node.expression.expression.getText(file.sourceFile);
      const handlers = node.arguments.slice(1);
      const finalHandler = handlers.at(-1);
      const behavior = handlerBehavior(finalHandler, file.sourceFile);
      let prefixes = [];
      if (receiver === 'app') {
        prefixes = [''];
      } else {
        const exportNames = routerExports.get(receiver) ?? [];
        for (const exportName of exportNames) {
          prefixes.push(...(mounts.get(`${file.path}::${exportName}`) ?? []));
        }
      }
      if (prefixes.length === 0) prefixes = [null];
      for (const prefix of [...new Set(prefixes)]) {
        const mountedPath = prefix === null ? null : joinPaths(prefix, localPath);
        const index = routes.length + 1;
        routes.push({
          id: routeId(method, mountedPath ?? localPath, index),
          method: method.toUpperCase(),
          routerPath: localPath,
          mountedPath,
          routerSymbol: receiver,
          middleware: handlers.slice(0, -1).map((handler) => nodeLabel(handler, file.sourceFile)),
          handlerSymbol: nodeLabel(finalHandler, file.sourceFile),
          ...behavior,
          sourcePath: file.path,
          lineStart: sourceLine(file.sourceFile, node),
          lineEnd: sourceEndLine(file.sourceFile, node),
        });
      }
    });
  }
  return routes.sort((left, right) =>
    `${left.sourcePath}:${left.lineStart}:${left.mountedPath}`.localeCompare(
      `${right.sourcePath}:${right.lineStart}:${right.mountedPath}`,
      'en',
    ),
  );
}

function templateText(node, sourceFile) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      value += `\${${span.expression.getText(sourceFile)}}${span.literal.text}`;
    }
    return value;
  }
  return node.getText(sourceFile).replace(/^['"`]|['"`]$/g, '');
}

function normalizeRequestPath(value) {
  return value
    .replace(/^\$\{API_URL\}/, '')
    .replace(/^API_URL/, '')
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/\/+/g, '/');
}

function containingFunctionName(node) {
  let current = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    ) {
      return current.parent.name.text;
    }
    if (ts.isMethodDeclaration(current) && current.name) return current.name.getText();
    current = current.parent;
  }
  return '<module>';
}

function collectFrontendRequests(files) {
  const requests = [];
  for (const file of files.filter(
    (candidate) =>
      !candidate.testSource &&
      (candidate.path.endsWith('.tsx') || candidate.path.startsWith('frontend/')),
  )) {
    walk(file.sourceFile, (node) => {
      if (
        !ts.isCallExpression(node) ||
        node.expression.getText(file.sourceFile) !== 'fetch' ||
        node.arguments.length === 0
      ) {
        return;
      }
      let method = 'GET';
      const options = node.arguments[1];
      if (options && ts.isObjectLiteralExpression(options)) {
        const methodProperty = options.properties.find(
          (property) =>
            ts.isPropertyAssignment(property) &&
            property.name.getText(file.sourceFile).replace(/['"]/g, '') === 'method',
        );
        if (
          methodProperty &&
          ts.isPropertyAssignment(methodProperty) &&
          ts.isStringLiteralLike(methodProperty.initializer)
        ) {
          method = methodProperty.initializer.text.toUpperCase();
        }
      }
      const pathTemplate = normalizeRequestPath(templateText(node.arguments[0], file.sourceFile));
      requests.push({
        id: requestId(file.path, sourceLine(file.sourceFile, node), requests.length + 1),
        method,
        pathTemplate,
        consumer: containingFunctionName(node),
        sourcePath: file.path,
        lineStart: sourceLine(file.sourceFile, node),
        lineEnd: sourceEndLine(file.sourceFile, node),
      });
    });
  }
  return requests;
}

function collectConfigurationReads(files) {
  const keys = new Set();
  const patterns = [
    /process\.env\.([A-Z](?:[A-Z0-9_]*[A-Z0-9])?)(?![A-Z0-9_])/g,
    /process\.env\[['"]([A-Z](?:[A-Z0-9_]*[A-Z0-9])?)['"]\]/g,
    /import\.meta\.env\.([A-Z](?:[A-Z0-9_]*[A-Z0-9])?)(?![A-Z0-9_])/g,
  ];
  for (const file of files) {
    const text = file.sourceFile.getFullText();
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) keys.add(match[1]);
    }
  }
  return [...keys].sort();
}

export function extractTypeScript(repoRoot, paths) {
  const absoluteToRelative = new Map();
  const files = paths
    .map((path) => toPosixPath(path))
    .filter((path) => /\.(?:[cm]?[jt]s|tsx|jsx)$/.test(path))
    .filter((path) => existsSync(resolve(repoRoot, ...path.split('/'))))
    .map((path) => {
      const absolutePath = resolve(repoRoot, ...path.split('/'));
      absoluteToRelative.set(absolutePath.toLowerCase(), path);
      const scriptKind =
        path.endsWith('.tsx') || path.endsWith('.jsx')
          ? ts.ScriptKind.TSX
          : path.endsWith('.js') || path.endsWith('.mjs')
            ? ts.ScriptKind.JS
            : ts.ScriptKind.TS;
      return {
        path,
        absolutePath,
        testSource: isTestPath(path),
        sourceFile: ts.createSourceFile(
          absolutePath,
          readFileSync(absolutePath, 'utf8'),
          ts.ScriptTarget.Latest,
          true,
          scriptKind,
        ),
      };
    });

  const imports = files.flatMap((file) =>
    importRecords(file.sourceFile, file.path, file.absolutePath, absoluteToRelative),
  );
  const symbols = files.flatMap((file) =>
    declaredSymbols(file.sourceFile, file.path, file.testSource),
  );

  for (const imported of imports) {
    if (!imported.targetPath || !imported.importedName) continue;
    const target =
      imported.importedName === 'default'
        ? symbols.find(
            (symbol) => symbol.sourcePath === imported.targetPath && symbol.defaultExport,
          )
        : symbols.find(
            (symbol) =>
              symbol.sourcePath === imported.targetPath && symbol.name === imported.importedName,
          );
    if (target && !target.consumers.includes(imported.sourcePath)) {
      target.consumers.push(imported.sourcePath);
      target.consumers.sort();
    }
  }

  const mounts = collectMounts(files, imports);
  const routes = collectRoutes(files, mounts);
  const frontendRequests = collectFrontendRequests(files);
  const configurationReads = collectConfigurationReads(files);

  return {
    symbols: symbols.sort((left, right) => left.id.localeCompare(right.id, 'en')),
    imports: imports.sort((left, right) =>
      `${left.sourcePath}:${left.lineStart}:${left.localName}`.localeCompare(
        `${right.sourcePath}:${right.lineStart}:${right.localName}`,
        'en',
      ),
    ),
    routes,
    frontendRequests,
    configurationReads,
  };
}
