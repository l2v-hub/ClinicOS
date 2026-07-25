import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import { normalizeId } from './contracts.mjs';

function absolutePath(repoRoot, path) {
  return resolve(repoRoot, ...path.split('/'));
}

function readText(repoRoot, path) {
  return readFileSync(absolutePath(repoRoot, path), 'utf8');
}

function readJson(repoRoot, path) {
  return JSON.parse(readText(repoRoot, path));
}

function projectRecords(repoRoot, inventory) {
  const projects = new Map();
  for (const record of inventory.filter((candidate) => candidate.pathType === 'file')) {
    if (record.path === 'package.json' || record.path.endsWith('/package.json')) {
      const manifest = readJson(repoRoot, record.path);
      const name = manifest.name ?? basename(dirname(record.path)) ?? 'repository';
      projects.set(name, {
        id: normalizeId(`project/${name}`),
        name,
        kind: 'node-package',
        path: record.path === 'package.json' ? '.' : dirname(record.path).replaceAll('\\', '/'),
        manifestPath: record.path,
        workspaces: manifest.workspaces ?? [],
        runtime: manifest.engines?.node ?? null,
      });
    }
    if (record.path.endsWith('/requirements.txt')) {
      const path = dirname(record.path).replaceAll('\\', '/');
      const name = basename(path);
      projects.set(name, {
        id: normalizeId(`project/${name}`),
        name,
        kind: 'python-package',
        path,
        manifestPath: record.path,
        dependencies: readText(repoRoot, record.path)
          .split(/\r?\n/)
          .map((line) => line.replace(/#.*/, '').trim())
          .filter(Boolean),
      });
    }
  }
  const structuralProjects = [
    {
      name: 'agent-team',
      kind: 'node-subsystem',
      path: 'agent-team',
      evidencePrefix: 'agent-team/',
    },
    {
      name: 'prisma',
      kind: 'data-schema',
      path: 'prisma',
      evidencePrefix: 'prisma/',
    },
    {
      name: 'repository-automation',
      kind: 'operational-tooling',
      path: 'scripts',
      evidencePrefix: 'scripts/',
    },
  ];
  for (const project of structuralProjects) {
    const present = inventory.some(
      (record) => record.pathType === 'file' && record.path.startsWith(project.evidencePrefix),
    );
    if (!present || projects.has(project.name)) continue;
    projects.set(project.name, {
      id: normalizeId(`project/${project.name}`),
      name: project.name,
      kind: project.kind,
      path: project.path,
      manifestPath: null,
    });
  }
  return [...projects.values()].sort((left, right) => left.name.localeCompare(right.name, 'en'));
}

function packageScriptRecords(repoRoot, inventory) {
  const records = [];
  for (const item of inventory.filter(
    (candidate) =>
      candidate.pathType === 'file' &&
      (candidate.path === 'package.json' || candidate.path.endsWith('/package.json')),
  )) {
    const manifest = readJson(repoRoot, item.path);
    for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
      records.push({
        id: normalizeId(`component/repository/package-script/${item.path}/${name}`),
        name,
        command,
        packageName: manifest.name ?? null,
        sourcePath: item.path,
      });
    }
  }
  return records.sort((left, right) => left.id.localeCompare(right.id, 'en'));
}

function workflowRecord(repoRoot, path) {
  const text = readText(repoRoot, path);
  const lines = text.split(/\r?\n/);
  const jobs = [];
  const triggers = [];
  const commands = [];
  let section = null;
  for (const line of lines) {
    if (/^on:\s*$/.test(line)) {
      section = 'on';
      continue;
    }
    if (/^jobs:\s*$/.test(line)) {
      section = 'jobs';
      continue;
    }
    if (/^[A-Za-z_-]+:\s*/.test(line)) section = null;
    if (section === 'on') {
      const match = line.match(/^\s{2}([A-Za-z0-9_-]+):/);
      if (match) triggers.push(match[1]);
    }
    if (section === 'jobs') {
      const match = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*$/);
      if (match) jobs.push(match[1]);
    }
    const command = line.match(/^\s*-\s+run:\s*(.+)$/)?.[1];
    if (command) commands.push(command.trim());
  }
  const secretNames = [
    ...new Set([...text.matchAll(/\bsecrets\.([A-Z][A-Z0-9_]*)\b/g)].map((match) => match[1])),
  ].sort();
  return {
    id: normalizeId(`component/repository/workflow/${path}`),
    name:
      lines
        .find((line) => /^name:\s*/.test(line))
        ?.replace(/^name:\s*/, '')
        .trim() ?? basename(path),
    path,
    triggers: [...new Set(triggers)].sort(),
    jobs: [...new Set(jobs)].sort(),
    commands,
    secretNames,
  };
}

function workflowRecords(repoRoot, inventory) {
  return inventory
    .filter(
      (record) =>
        record.pathType === 'file' && /^\.github\/workflows\/.+\.ya?ml$/.test(record.path),
    )
    .map((record) => workflowRecord(repoRoot, record.path))
    .sort((left, right) => left.path.localeCompare(right.path, 'en'));
}

function composeRecords(repoRoot, inventory) {
  const compose = inventory.find(
    (record) =>
      record.pathType === 'file' && /(^|\/)docker-compose(?:\.[^.]+)?\.ya?ml$/.test(record.path),
  );
  if (!compose) return [];
  const lines = readText(repoRoot, compose.path).split(/\r?\n/);
  const services = [];
  let inServices = false;
  let current = null;
  let list = null;
  for (const line of lines) {
    if (/^services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }
    if (inServices && /^[A-Za-z]/.test(line)) {
      inServices = false;
      current = null;
    }
    if (!inServices) continue;
    const service = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*$/);
    if (service) {
      current = {
        id: normalizeId(`integration/container/${service[1]}`),
        name: service[1],
        image: null,
        ports: [],
        volumes: [],
        sourcePath: compose.path,
      };
      services.push(current);
      list = null;
      continue;
    }
    if (!current) continue;
    const property = line.match(/^\s{4}(image|ports|volumes):\s*(.*)$/);
    if (property) {
      const [, name, value] = property;
      if (name === 'image') current.image = value.replace(/^['"]|['"]$/g, '');
      if (name === 'ports' || name === 'volumes') list = name;
      continue;
    }
    const item = line.match(/^\s{6}-\s*['"]?([^'"]+)['"]?\s*$/)?.[1];
    if (item && list) current[list].push(item);
  }
  return services;
}

function configurationDeclarations(repoRoot, inventory) {
  const records = [];
  for (const item of inventory.filter(
    (record) => record.pathType === 'file' && /\.env\.example$/.test(record.path),
  )) {
    const lines = readText(repoRoot, item.path).split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index].match(/^\s*([A-Z][A-Z0-9_]*)\s*=/);
      if (!match) continue;
      records.push({
        id: normalizeId(`config/declaration/${match[1]}/${item.path}`),
        name: match[1],
        sourcePath: item.path,
        lineStart: index + 1,
        valueIncluded: false,
      });
    }
  }
  return records.sort((left, right) => left.id.localeCompare(right.id, 'en'));
}

function testType(path) {
  const lower = path.toLowerCase();
  if (lower.includes('playwright') || lower.startsWith('e2e/')) return 'e2e';
  if (lower.includes('/integration/')) return 'integration';
  if (lower.includes('security')) return 'security';
  if (lower.includes('migration')) return 'migration';
  if (lower.includes('contract')) return 'contract';
  return 'unit';
}

function testRecords(inventory) {
  return inventory
    .filter((record) => record.pathType === 'file' && record.classification === 'test-source')
    .map((record) => ({
      id: normalizeId(`test/repository/${record.path}`),
      path: record.path,
      type: testType(record.path),
      framework: record.path.endsWith('.py')
        ? 'unittest'
        : record.path.includes('playwright')
          ? 'playwright'
          : 'node-test',
    }))
    .sort((left, right) => left.id.localeCompare(right.id, 'en'));
}

function requirementRecords(inventory) {
  return inventory
    .filter((record) => record.pathType === 'file')
    .map((record) => {
      const match = record.path.match(/(?:^|\/)(REQ-\d+)[^/]*\.md$/i);
      if (!match) return null;
      return {
        id: normalizeId(`component/repository/requirement/${match[1]}`),
        requirementId: match[1].toUpperCase(),
        path: record.path,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.requirementId.localeCompare(right.requirementId, 'en'));
}

function deploymentRecords(repoRoot, inventory) {
  return inventory
    .filter(
      (record) =>
        record.pathType === 'file' &&
        (record.path.endsWith('railway.json') || record.path.endsWith('vercel.json')),
    )
    .map((record) => {
      const platform = record.path.endsWith('railway.json') ? 'railway' : 'vercel';
      const config = readJson(repoRoot, record.path);
      return {
        id: normalizeId(`integration/${platform}/${record.path}`),
        platform,
        sourcePath: record.path,
        startCommand: config.deploy?.startCommand ?? null,
        healthcheckPath: config.deploy?.healthcheckPath ?? null,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id, 'en'));
}

function artifactRecords(inventory) {
  return inventory
    .filter(
      (record) => record.pathType !== 'directory' && record.classification === 'metadata-only',
    )
    .map((record) => ({
      id: normalizeId(`component/repository/artifact/${record.path}`),
      path: record.path,
      bytes: record.bytes,
      sha256: record.sha256,
      gitState: record.gitState,
      contentIncluded: false,
    }))
    .sort((left, right) => left.id.localeCompare(right.id, 'en'));
}

export function extractRepositorySurfaces(repoRoot, inventory) {
  return {
    projects: projectRecords(repoRoot, inventory),
    packageScripts: packageScriptRecords(repoRoot, inventory),
    workflows: workflowRecords(repoRoot, inventory),
    containers: composeRecords(repoRoot, inventory),
    configurationDeclarations: configurationDeclarations(repoRoot, inventory),
    testSurfaces: testRecords(inventory),
    requirements: requirementRecords(inventory),
    deployments: deploymentRecords(repoRoot, inventory),
    artifacts: artifactRecords(inventory),
  };
}
