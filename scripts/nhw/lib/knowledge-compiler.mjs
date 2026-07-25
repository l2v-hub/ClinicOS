import { basename } from 'node:path';

import { normalizeId, sha256 } from './contracts.mjs';
import { REQUIRED_HEADINGS } from './markdown.mjs';

const DESIGN_SOURCE = 'docs/superpowers/specs/2026-07-25-clinicos-nhw-knowledge-base-design.md';

const CONTEXTS = [
  {
    id: 'context.identity-access',
    title: 'Identity and Access',
    terms: ['user', 'operator', 'auth', 'entra'],
  },
  {
    id: 'context.patient-registry',
    title: 'Patient Registry',
    terms: ['patient'],
  },
  {
    id: 'context.clinical-record',
    title: 'Clinical Record',
    terms: ['cartella', 'clinical', 'narrative', 'diary', 'document'],
  },
  {
    id: 'context.therapy-administration',
    title: 'Therapy Administration',
    terms: ['therapy', 'medication'],
  },
  {
    id: 'context.intake-document-processing',
    title: 'Intake and Document Processing',
    terms: ['intake', 'import', 'extraction'],
  },
  {
    id: 'context.facility-occupancy',
    title: 'Facility Occupancy',
    terms: ['room', 'bed', 'assignment', 'occupancy'],
  },
  {
    id: 'context.scheduling',
    title: 'Scheduling',
    terms: ['appointment', 'schedule'],
  },
  {
    id: 'context.operator-collaboration',
    title: 'Operator Collaboration',
    terms: ['consegna', 'nota', 'note'],
  },
  {
    id: 'context.ai-assistance',
    title: 'AI Assistance',
    terms: ['assistant', 'ai-', 'agnos', 'audit'],
  },
  {
    id: 'context.delivery-quality-governance',
    title: 'Delivery, Quality, and Governance',
    terms: ['quality', 'agent-team', 'workflow', 'deploy'],
  },
];

const FLOW_DEFINITIONS = [
  ['flow.application-startup', 'Application startup and shutdown', ['server.ts', 'main.py']],
  [
    'flow.authentication-token-propagation',
    'Authentication and token propagation',
    ['entra-auth.ts'],
  ],
  ['flow.patient-lifecycle', 'Patient creation, resolution, update, and deletion', ['patients.ts']],
  ['flow.patient-room-assignment', 'Patient room and bed assignment', ['admin-rooms.ts']],
  ['flow.patient-intake', 'Patient intake extraction, review, apply, and confirmation', ['intake']],
  ['flow.clinical-document-access', 'Protected clinical document access', ['patient-documents.ts']],
  ['flow.therapy-administration', 'Therapy scheduling and administration', ['therap']],
  ['flow.patient-diary-narrative', 'Patient diary and narrative management', ['narrative']],
  ['flow.appointment-scheduling', 'Appointments and operator schedules', ['appointment']],
  ['flow.operator-collaboration', 'Consegne and notes collaboration', ['consegne', 'notes.ts']],
  [
    'flow.agnos-action-execution',
    'Agnos planning and allowlisted action execution',
    ['orchestrate.ts'],
  ],
  ['flow.assistant-read-composition', 'Assistant read planning and composition', ['assistant']],
  ['flow.ai-extraction-job-lifecycle', 'AI extraction job lifecycle', ['job-service.ts', 'app.py']],
  [
    'flow.frontend-api-navigation',
    'Frontend navigation and API error handling',
    ['frontend/src/App.tsx'],
  ],
  [
    'flow.agent-team-task-lifecycle',
    'Agent-team claim, development, QA, and closure',
    ['agent-team/src'],
  ],
  [
    'flow.build-test-migrate-deploy',
    'Build, test, migration, deployment, and health checks',
    ['package.json'],
  ],
];

const PROJECT_SOURCE_FALLBACKS = {
  'agent-team': 'agent-team/src/cli.mjs',
  prisma: 'prisma/schema.prisma',
  'repository-automation': 'scripts/quality-gate/check-closure.js',
};

function text(value) {
  if (value === undefined || value === null || value === '') return 'None observed';
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => `- ${String(item)}`).join('\n') : 'None observed';
  }
  return String(value);
}

function json(value) {
  return value === undefined || value === null || value.length === 0
    ? 'None observed'
    : `\`${JSON.stringify(value)}\``;
}

function source(path, symbol, lineStart, lineEnd, confidence = 'observed') {
  return {
    path,
    ...(symbol ? { symbol } : {}),
    ...(lineStart ? { line_start: lineStart } : {}),
    ...(lineEnd ? { line_end: lineEnd } : {}),
    confidence,
  };
}

function evidenceText(sources) {
  return sources
    .map((item) => {
      const span = item.line_start
        ? `:${item.line_start}${item.line_end ? `-${item.line_end}` : ''}`
        : '';
      return `- \`${item.path}${span}\`${item.symbol ? ` — ${item.symbol}` : ''}`;
    })
    .join('\n');
}

function relatedText(relations) {
  return relations.length > 0
    ? relations.map((relation) => `- \`${relation.type}\` → \`${relation.target}\``).join('\n')
    : 'None observed';
}

function unitFileName(identifier) {
  const suffix = identifier.split('.').at(-1).slice(0, 42);
  return `${suffix}-${sha256(identifier).slice(0, 12)}.md`;
}

function record(folder, definition, inventoryHash, fixedName) {
  const status = definition.status ?? 'observed';
  const sources = definition.sources?.length
    ? definition.sources
    : [source(DESIGN_SOURCE, undefined, undefined, undefined, 'declared')];
  const relations = [...(definition.relations ?? [])]
    .filter(
      (relation, index, values) =>
        values.findIndex(
          (candidate) => candidate.type === relation.type && candidate.target === relation.target,
        ) === index,
    )
    .sort((left, right) =>
      `${left.type}.${left.target}`.localeCompare(`${right.type}.${right.target}`, 'en'),
    );
  const defaults = {
    'Question Answered': `What does \`${definition.id}\` represent in ClinicOS?`,
    'Canonical Definition': `${definition.id} is the canonical ${definition.kind} named ${definition.title}.`,
    Inputs: 'None observed',
    Outputs: 'None observed',
    Dependencies: 'None observed',
    'Side Effects': 'None observed',
    Consumers: 'None observed',
    Invariants: 'None observed',
    'Failure Modes': 'None observed',
    Evidence: evidenceText(sources),
    'Related Knowledge': relatedText(relations),
  };
  const unit = {
    path: `docs/nhw/${folder}/${fixedName ?? unitFileName(definition.id)}`,
    id: definition.id,
    kind: definition.kind,
    title: definition.title,
    status,
    summary: definition.summary,
    boundedContexts: definition.boundedContexts ?? [],
    sources,
    relations: relations.map((relation) => ({
      ...relation,
      evidence: relation.evidence ?? sources.map((item) => item.path),
      confidence: relation.confidence ?? (status === 'inferred' ? 'inferred' : 'observed'),
    })),
    tags: definition.tags ?? [],
    lastVerified: {
      commit: 'working-tree',
      inventory_hash: inventoryHash,
    },
    inferenceRule: definition.inferenceRule,
    sections: { ...defaults, ...(definition.sections ?? {}) },
  };
  for (const heading of REQUIRED_HEADINGS) {
    if (!unit.sections[heading]) unit.sections[heading] = 'None observed';
  }
  return { path: unit.path, unit };
}

function projectForPath(path, projects) {
  const candidates = projects
    .filter((project) => project.path !== '.')
    .filter((project) => path === project.path || path.startsWith(`${project.path}/`))
    .sort((left, right) => right.path.length - left.path.length);
  if (candidates[0]) return candidates[0].id;
  if (path.startsWith('agent-team/')) return 'project.agent-team';
  if (path.startsWith('prisma/')) return 'project.prisma';
  if (path.startsWith('scripts/')) return 'project.repository-automation';
  return projects.find((project) => project.path === '.')?.id ?? 'system.clinicos';
}

function contextFor(value) {
  const lower = String(value).toLowerCase();
  return (
    CONTEXTS.find((context) => context.terms.some((term) => lower.includes(term)))?.id ??
    'context.delivery-quality-governance'
  );
}

function projectSource(project) {
  if (project.manifestPath) return project.manifestPath;
  return (
    PROJECT_SOURCE_FALLBACKS[project.name] ??
    (project.path === '.' ? 'package.json' : `${project.path}/package.json`)
  );
}

function modelFieldLines(model) {
  return model.fields.map((field) => {
    const constraints = [
      field.id ? 'id' : null,
      field.unique ? 'unique' : null,
      field.nullable ? 'nullable' : 'required',
      field.list ? 'list' : null,
      field.default ? `default=${field.default}` : null,
    ].filter(Boolean);
    return `- \`${field.name}: ${field.rawType ?? field.type}\` (${constraints.join(', ')})`;
  });
}

function modelRelationLines(model) {
  return model.fields
    .filter((field) => field.relation)
    .map(
      (field) =>
        `- \`${field.name}\` → \`${field.relation.target}\` (${field.relation.cardinality}; onDelete=${field.relation.onDelete ?? 'unspecified'})`,
    );
}

function modelRelations(model, modelIds) {
  return model.fields
    .filter((field) => field.relation && modelIds.has(field.relation.target.toLowerCase()))
    .map((field) => ({
      type: 'depends-on',
      target: `data.model.${field.relation.target.toLowerCase()}`,
    }));
}

function addUnique(target, value) {
  if (!target.some((record) => record.unit.id === value.unit.id)) target.push(value);
}

function publicComponents(catalogs, inventoryHash) {
  const records = [];
  const projects = catalogs.projects.projects;
  for (const symbol of catalogs.typescriptSymbols.filter(
    (candidate) => candidate.exported && !candidate.testSource,
  )) {
    const projectId = projectForPath(symbol.sourcePath, projects);
    const boundedContext = contextFor(`${symbol.name} ${symbol.sourcePath}`);
    addUnique(
      records,
      record(
        `04-components/${projectId.replace('project.', '')}`,
        {
          id: symbol.id,
          kind: `typescript-${symbol.kind}`,
          title: symbol.name,
          summary: `Exported ${symbol.kind} from ${symbol.sourcePath}.`,
          boundedContexts: [boundedContext],
          sources: [source(symbol.sourcePath, symbol.name, symbol.lineStart, symbol.lineEnd)],
          relations: [{ type: 'belongs-to', target: projectId }],
          tags: ['typescript', symbol.kind],
          sections: {
            Inputs:
              symbol.kind === 'function' || symbol.kind === 'class'
                ? 'Defined by the source signature at the cited span.'
                : 'None observed',
            Outputs:
              symbol.kind === 'function' ? 'Defined by the exported return type.' : 'None observed',
            Dependencies: `Owning project: \`${projectId}\`.`,
            Consumers: text((symbol.consumers ?? []).map((path) => `\`${path}\``)),
            Invariants: `The symbol is exported across its module boundary as \`${symbol.name}\`.`,
            'Failure Modes': 'Refer to callers and implementation at the cited source span.',
          },
        },
        inventoryHash,
      ),
    );
  }
  for (const symbol of catalogs.pythonSymbols.filter(
    (candidate) => candidate.public && !candidate.testSource,
  )) {
    const projectId = projectForPath(symbol.sourcePath, projects);
    addUnique(
      records,
      record(
        '04-components/ai-runtime',
        {
          id: symbol.id,
          kind: `python-${symbol.kind}`,
          title: symbol.name,
          summary: `Public Python ${symbol.kind} from ${symbol.sourcePath}.`,
          boundedContexts: [contextFor(`${symbol.name} ${symbol.sourcePath}`)],
          sources: [source(symbol.sourcePath, symbol.name, symbol.lineStart, symbol.lineEnd)],
          relations: [{ type: 'belongs-to', target: projectId }],
          tags: ['python', symbol.kind],
          sections: {
            Inputs: 'Defined by the Python signature at the cited source span.',
            Outputs: 'Defined by return annotations and implementation.',
            Dependencies: `Owning project: \`${projectId}\`.`,
            Consumers: 'Import consumers are resolved through the source graph.',
            Invariants: `The public symbol name is \`${symbol.name}\`.`,
          },
        },
        inventoryHash,
      ),
    );
  }
  for (const request of catalogs.frontendRequests) {
    addUnique(
      records,
      record(
        '04-components/frontend',
        {
          id: request.id,
          kind: 'frontend-api-consumer',
          title: `${request.consumer} ${request.method} ${request.pathTemplate}`,
          summary: `Frontend request issued by ${request.consumer}.`,
          boundedContexts: [contextFor(request.pathTemplate)],
          sources: [
            source(request.sourcePath, request.consumer, request.lineStart, request.lineEnd),
          ],
          relations: [{ type: 'belongs-to', target: 'project.frontend' }],
          tags: ['frontend', 'api-consumer'],
          sections: {
            Inputs: `HTTP method: \`${request.method}\`; path template: \`${request.pathTemplate}\`.`,
            Outputs: 'Consumes the backend HTTP response.',
            Dependencies: 'Backend route matching is resolved by method and normalized path.',
            'Side Effects': 'Performs a browser-originated HTTP request.',
            Consumers: `Frontend caller: \`${request.consumer}\`.`,
            Invariants: 'The configured API base URL is applied by the frontend request layer.',
          },
        },
        inventoryHash,
      ),
    );
  }
  return records;
}

function contractUnits(inventoryHash) {
  const definitions = [
    ['ontology', 'system.clinicos-ontology', 'Knowledge Ontology'],
    ['source-precedence', 'system.source-precedence', 'Source Precedence'],
    ['retrieval-contract', 'system.retrieval-contract', 'Retrieval Contract'],
    ['exclusions', 'system.exclusion-contract', 'Exclusion Contract'],
  ];
  return definitions.map(([name, id, title]) =>
    record(
      '00-contract',
      {
        id,
        kind: 'knowledge-contract',
        title,
        status: 'declared',
        summary: `${title} governing the ClinicOS NHW knowledge base.`,
        sources: [
          source(DESIGN_SOURCE, undefined, 1, 520, 'declared'),
          ...(name === 'retrieval-contract'
            ? [source('docs/nhw/README.md', undefined, 1, 20, 'declared')]
            : []),
        ],
        relations: [{ type: 'belongs-to', target: 'system.clinicos' }],
        tags: ['nhw', 'contract'],
        sections: {
          Inputs: 'Repository inventory, semantic catalogs, and atomic knowledge units.',
          Outputs: 'Deterministic retrieval and validation rules.',
          Dependencies: 'The approved NHW design specification.',
          Consumers: 'Future LLM agents, validators, and graph traversals.',
          Invariants: 'Executable runtime evidence outranks narrative documentation.',
          'Failure Modes': 'Validation fails closed for malformed or uncovered semantic objects.',
        },
      },
      inventoryHash,
      `${name}.md`,
    ),
  );
}

function systemUnits(catalogs, inventoryHash) {
  const projectRelations = catalogs.projects.projects.map((project) => ({
    type: 'contains',
    target: project.id,
  }));
  const system = record(
    '01-system',
    {
      id: 'system.clinicos',
      kind: 'system',
      title: 'ClinicOS',
      summary:
        'Clinical operations system composed of browser, HTTP API, PostgreSQL schema, AI runtime, and autonomous delivery tooling.',
      sources: [
        source('package.json'),
        source('backend/src/app.ts'),
        source('frontend/src/App.tsx'),
        source('clinicos-ai-runtime/clinicos_ai/api/app.py'),
        source('prisma/schema.prisma'),
      ],
      relations: projectRelations,
      tags: ['clinicos', 'system'],
      sections: {
        Inputs:
          'Operator interactions, clinical data, documents, configuration, and automation tasks.',
        Outputs:
          'Clinical workflows, persisted records, AI-assisted results, and delivery evidence.',
        Dependencies: text(catalogs.projects.projects.map((project) => `\`${project.id}\``)),
        'Side Effects':
          'Writes PostgreSQL state, emits HTTP responses, invokes model providers, and creates QA evidence.',
        Consumers:
          'Clinical operators, administrators, deployment platforms, and autonomous agents.',
        Invariants:
          'The Express backend owns primary persistence; the AI runtime is a separately deployed service.',
        'Failure Modes':
          'Configuration, persistence, authentication, provider, and deployment failures are surfaced by their owning runtime.',
      },
    },
    inventoryHash,
    'system-overview.md',
  );
  const architectureDefinitions = [
    ['system.startup-topology', 'Startup Topology', 'composition and startup order'],
    ['system.lifecycle', 'System Lifecycle', 'startup, readiness, operation, and shutdown'],
    ['system.dependency-topology', 'Dependency Topology', 'project and integration dependencies'],
    ['system.architectural-patterns', 'Architectural Patterns', 'implemented structural patterns'],
    [
      'system.cross-cutting-concerns',
      'Cross-Cutting Concerns',
      'authentication, logging, errors, caching, and quality',
    ],
  ];
  return [
    system,
    ...architectureDefinitions.map(([id, title, subject]) =>
      record(
        '01-system',
        {
          id,
          kind: 'system-view',
          title,
          status: 'inferred',
          inferenceRule: `Reconstructed from runtime composition roots and catalogs for ${subject}.`,
          summary: `System view of ClinicOS ${subject}.`,
          sources: system.unit.sources,
          relations: [{ type: 'belongs-to', target: 'system.clinicos' }],
          tags: ['architecture', 'system-view'],
          sections: {
            Inputs: 'Executable composition roots and project manifests.',
            Outputs: `A canonical view of ${subject}.`,
            Dependencies: text(catalogs.projects.projects.map((project) => `\`${project.id}\``)),
            Consumers: 'Architecture retrieval and impact analysis.',
            Invariants: 'Runtime code takes precedence over lower-ranked narrative sources.',
          },
        },
        inventoryHash,
      ),
    ),
  ];
}

function projectUnits(catalogs, inventoryHash) {
  return catalogs.projects.projects.map((project) =>
    record(
      '01-system/projects',
      {
        id: project.id,
        kind: project.kind,
        title: project.name,
        summary: `${project.name} project rooted at ${project.path}.`,
        sources: [source(projectSource(project))],
        relations: [{ type: 'belongs-to', target: 'system.clinicos' }],
        tags: ['project', project.kind],
        sections: {
          Inputs: project.manifestPath
            ? `Manifest: \`${project.manifestPath}\`.`
            : 'Project membership is inferred from its structural root.',
          Outputs: `Runtime or repository capability owned below \`${project.path}\`.`,
          Dependencies: project.dependencies
            ? text(project.dependencies)
            : text(project.workspaces),
          'Side Effects':
            project.kind === 'data-schema'
              ? 'Defines persistent schema.'
              : 'Defined by owned components.',
          Consumers: 'ClinicOS system composition and downstream project consumers.',
          Invariants: `Owned repository prefix: \`${project.path}\`.`,
        },
      },
      inventoryHash,
    ),
  );
}

function contextUnits(catalogs, inventoryHash) {
  const evidenceCandidates = [
    ...catalogs.prismaModels.map((model) => ({
      value: `${model.name} ${model.sourcePath}`,
      path: model.sourcePath,
      lineStart: model.lineStart,
      lineEnd: model.lineEnd,
    })),
    ...catalogs.expressRoutes.map((route) => ({
      value: `${route.mountedPath ?? route.routerPath} ${route.sourcePath}`,
      path: route.sourcePath,
      lineStart: route.lineStart,
      lineEnd: route.lineEnd,
    })),
  ];
  return CONTEXTS.map((context) => {
    const matches = evidenceCandidates.filter((candidate) =>
      context.terms.some((term) => candidate.value.toLowerCase().includes(term)),
    );
    const sources = (matches.length > 0 ? matches.slice(0, 6) : evidenceCandidates.slice(0, 1)).map(
      (candidate) => source(candidate.path, undefined, candidate.lineStart, candidate.lineEnd),
    );
    const models = catalogs.prismaModels
      .filter((model) => contextFor(model.name) === context.id)
      .map((model) => `data.model.${model.name.toLowerCase()}`);
    return record(
      '02-contexts',
      {
        id: context.id,
        kind: 'bounded-context',
        title: context.title,
        status: 'inferred',
        inferenceRule:
          'Grouped from cohesive model names, mounted route prefixes, UI consumers, and persistence ownership.',
        summary: `${context.title} bounded context reconstructed from executable ClinicOS sources.`,
        boundedContexts: [context.id],
        sources,
        relations: [
          { type: 'belongs-to', target: 'system.clinicos' },
          ...models.map((target) => ({ type: 'contains', target })),
        ],
        tags: ['bounded-context'],
        sections: {
          Inputs: 'Commands and queries routed to the context-owned APIs and components.',
          Outputs: 'State transitions and read models owned by this context.',
          Dependencies: text(models.map((id) => `\`${id}\``)),
          'Side Effects': 'Defined by owned endpoint and persistence units.',
          Consumers: 'Frontend workflows and cross-context runtime flows.',
          Invariants:
            'Ownership is assigned by observed cohesion; cross-context dependencies remain explicit graph edges.',
          'Failure Modes':
            'Context-level failures are the union of owned endpoint, domain, persistence, and integration failures.',
        },
      },
      inventoryHash,
    );
  });
}

function dataUnits(catalogs, inventoryHash) {
  const records = [];
  const modelIds = new Set(catalogs.prismaModels.map((model) => model.name.toLowerCase()));
  for (const model of catalogs.prismaModels) {
    const contextId = contextFor(model.name);
    const modelSource = source(model.sourcePath, model.name, model.lineStart, model.lineEnd);
    const relationships = modelRelationLines(model);
    addUnique(
      records,
      record(
        '07-data/models',
        {
          id: model.id,
          kind: 'data-model',
          title: model.name,
          summary: `Prisma persistence model ${model.name}.`,
          boundedContexts: [contextId],
          sources: [modelSource],
          relations: [
            { type: 'belongs-to', target: 'project.prisma' },
            ...modelRelations(model, modelIds),
          ],
          tags: ['prisma', 'database-model'],
          sections: {
            Inputs: modelFieldLines(model).join('\n'),
            Outputs: `Persisted PostgreSQL row for \`${model.name}\`.`,
            Dependencies: text(relationships),
            'Side Effects': 'Database reads and writes through Prisma clients.',
            Consumers: 'Backend routes, services, migrations, and operational jobs.',
            Invariants:
              [
                ...model.fields
                  .filter((field) => field.id || field.unique || !field.nullable)
                  .map(
                    (field) =>
                      `- \`${field.name}\`: ${field.id ? 'identifier; ' : ''}${field.unique ? 'unique; ' : ''}${field.nullable ? 'nullable' : 'required'}`,
                  ),
                ...model.indexes.map(
                  (index) => `- ${index.kind} on \`${index.fields.join(', ')}\``,
                ),
                ...model.uniqueConstraints.map(
                  (constraint) => `- unique constraint on \`${constraint.fields.join(', ')}\``,
                ),
              ].join('\n') || 'None observed',
            'Failure Modes':
              'Constraint violations, relation violations, unavailable database, or Prisma operation errors.',
          },
        },
        inventoryHash,
      ),
    );
    addUnique(
      records,
      record(
        '03-domain/entities',
        {
          id: `entity.${model.name.toLowerCase()}`,
          kind: 'domain-entity',
          title: model.name,
          status: 'inferred',
          inferenceRule:
            'Business entity reconstructed from the current Prisma model and its executable consumers.',
          summary: `Business entity persisted by the ${model.name} Prisma model.`,
          boundedContexts: [contextId],
          sources: [modelSource],
          relations: [
            { type: 'belongs-to', target: contextId },
            { type: 'persists-as', target: model.id },
          ],
          tags: ['domain-entity', model.name.toLowerCase()],
          sections: {
            Inputs: modelFieldLines(model).join('\n'),
            Outputs: `Lifecycle state persisted as \`${model.id}\`.`,
            Dependencies: text(relationships),
            'Side Effects': 'Creation, mutation, and deletion alter persistent clinical state.',
            Consumers:
              'Endpoint and UI consumers are navigable through graph relations to the persistence model.',
            Invariants: `Identity, nullability, uniqueness, defaults, and relations are authoritative in \`${model.sourcePath}\`.`,
            'Failure Modes':
              'Invalid transitions are rejected by API validation or persistence constraints; uncovered business ambiguity is not invented.',
          },
        },
        inventoryHash,
      ),
    );
  }
  for (const migration of catalogs.migrations) {
    const affected = [
      ...new Set(
        migration.operations
          .map((operation) => operation.target?.split('_')[0]?.toLowerCase())
          .filter((target) => target && modelIds.has(target)),
      ),
    ];
    addUnique(
      records,
      record(
        '07-data/migrations',
        {
          id: migration.id,
          kind: 'database-migration',
          title: migration.migrationId,
          summary: `Ordered SQL migration ${migration.migrationId}.`,
          sources: [source(migration.sourcePath)],
          relations: [
            { type: 'belongs-to', target: 'project.prisma' },
            ...affected.map((target) => ({ type: 'writes', target: `data.model.${target}` })),
          ],
          tags: ['migration', migration.destructive ? 'destructive' : 'non-destructive'],
          sections: {
            Inputs: `Migration order: \`${migration.migrationId}\`.`,
            Outputs: migration.operations
              .map(
                (operation) =>
                  `- ${operation.order}. \`${operation.type}\`${operation.target ? ` on \`${operation.target}\`` : ''}`,
              )
              .join('\n'),
            Dependencies:
              'Applied against the preceding migration state and reconciled with the current Prisma schema.',
            'Side Effects': 'Mutates PostgreSQL schema and, where encoded by SQL, stored data.',
            Consumers: 'Prisma deployment and backend startup migration command.',
            Invariants: `Destructive classification: \`${migration.destructive}\`.`,
            'Failure Modes':
              'SQL execution failure, incompatible existing data, violated constraints, or deployment interruption.',
          },
        },
        inventoryHash,
      ),
    );
  }
  return records;
}

function endpointUnit(route, runtime, projects, modelIds, inventoryHash) {
  const path = route.mountedPath ?? route.path ?? route.routerPath;
  const projectId = runtime === 'express' ? 'project.backend' : 'project.clinicos-ai-runtime';
  const persistenceCalls = route.persistenceCalls ?? [];
  const persistedModels = [
    ...new Set(
      persistenceCalls
        .map((call) => call.match(/^prisma\.([a-zA-Z0-9_]+)/)?.[1]?.toLowerCase())
        .filter((name) => name && modelIds.has(name)),
    ),
  ];
  const relations = [
    { type: 'belongs-to', target: projectId },
    ...persistedModels.map((name) => ({
      type: /(?:create|update|delete|upsert)\b/i.test(persistenceCalls.join(' '))
        ? 'writes'
        : 'reads',
      target: `data.model.${name}`,
    })),
  ];
  const requestInputs = [
    ...(route.requestReads ?? []),
    ...(route.pathParams ?? []).map((name) => `path:${name}`),
    ...(route.headerParams ?? []).map((name) => `header:${name}`),
    ...(route.requestModels ?? []).map((name) => `body:${name}`),
  ];
  const statuses =
    runtime === 'express'
      ? (route.responseStatuses ?? [])
      : [...new Set([route.statusCode ?? 200, ...(route.errorStatuses ?? [])])];
  return record(
    `06-api/endpoints/${runtime}`,
    {
      id: route.id,
      kind: 'api-endpoint',
      title: `${route.method} ${path ?? '(unmounted)'}`,
      summary:
        path === null
          ? `${route.method} router-local endpoint not mounted by the Express composition root.`
          : `${route.method} ${path} endpoint implemented by the ${runtime} runtime.`,
      boundedContexts: [contextFor(`${path} ${route.sourcePath}`)],
      sources: [
        source(
          route.sourcePath,
          route.handler ?? route.routerSymbol,
          route.lineStart,
          route.lineEnd,
        ),
      ],
      relations,
      tags: ['api', runtime, route.method.toLowerCase()],
      sections: {
        Inputs: [
          `- Method: \`${route.method}\``,
          `- Path: \`${path ?? 'unmounted'}\``,
          `- Request inputs: ${json(requestInputs)}`,
          `- Middleware/dependencies: ${json(route.middleware ?? route.dependencyParams ?? [])}`,
        ].join('\n'),
        Outputs: `Observed HTTP statuses: ${json(statuses)}; response model: \`${route.responseModel ?? 'not explicitly declared'}\`.`,
        Dependencies: [
          `Persistence calls: ${json(persistenceCalls)}`,
          `External calls: ${json(route.externalCalls ?? [])}`,
          `Background tasks: ${json(route.backgroundTasks ?? [])}`,
        ].join('\n'),
        'Side Effects': text(route.sideEffects ?? route.backgroundTasks),
        Consumers:
          'Frontend request consumers and external HTTP clients matching this method and path.',
        Invariants:
          path === null
            ? 'The router is not mounted by the observed Express composition root.'
            : 'The complete mounted path is reconstructed from the runtime composition root.',
        'Failure Modes': `Observed error statuses: ${json(statuses.filter((status) => status >= 400))}. Handler-level triggers remain at the cited source span.`,
      },
    },
    inventoryHash,
  );
}

function configurationUnit(configuration, inventoryHash) {
  const sources = (configuration.sources ?? []).map((item) =>
    source(item.path, configuration.name, item.lineStart, item.lineEnd),
  );
  const securityClass = /(?:SECRET|TOKEN|PASSWORD|API_KEY|DATABASE_URL|CLIENT_SECRET)/.test(
    configuration.name,
  )
    ? 'sensitive-name; value intentionally excluded'
    : configuration.name.startsWith('VITE_')
      ? 'browser-visible configuration'
      : 'runtime configuration';
  return record(
    '09-configuration/keys',
    {
      id: configuration.id,
      kind: 'configuration-key',
      title: configuration.name,
      summary: `Configuration key ${configuration.name}; generated knowledge never includes its value.`,
      sources,
      relations: [{ type: 'belongs-to', target: 'system.clinicos' }],
      tags: ['configuration', ...configuration.runtimes],
      sections: {
        Inputs: `Environment variable name: \`${configuration.name}\`.`,
        Outputs: `Runtime scopes: ${json(configuration.runtimes)}.`,
        Dependencies: `Declared in example configuration: \`${Boolean(configuration.declared)}\`.`,
        'Side Effects':
          'May alter runtime behavior in the consuming process; no value is captured in this knowledge base.',
        Consumers: text(configuration.runtimes),
        Invariants: `Security classification: ${securityClass}.`,
        'Failure Modes':
          'Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.',
      },
    },
    inventoryHash,
  );
}

function repositoryUnit(item, inventoryHash) {
  const title = basename(item.path);
  const id = `component.repository.source.${sha256(item.path).slice(0, 20)}`;
  return record(
    '12-repository/source-files',
    {
      id,
      kind: 'repository-source',
      title,
      status: item.classification === 'narrative-source' ? 'declared' : 'observed',
      summary: `Repository source path ${item.path} classified as ${item.classification}.`,
      sources: [
        source(
          item.path,
          undefined,
          undefined,
          undefined,
          item.classification === 'narrative-source' ? 'declared' : 'observed',
        ),
      ],
      relations: [{ type: 'belongs-to', target: 'system.clinicos' }],
      tags: ['repository-source', item.classification],
      sections: {
        Inputs: `Path classification: \`${item.classification}\`; reason: \`${item.reason ?? 'inventory rule'}\`.`,
        Outputs:
          'Makes the authored source independently retrievable through its stable knowledge identifier.',
        Dependencies: 'Repository inventory and file hash.',
        Consumers: 'Coverage reconciliation, semantic retrieval, and impact analysis.',
        Invariants:
          'The file payload remains authoritative; this unit stores metadata and purpose, not a duplicate payload.',
        'Failure Modes':
          'A changed file hash invalidates stale source evidence until regeneration.',
      },
    },
    inventoryHash,
  );
}

function flowUnits(catalogs, inventoryHash) {
  const sourcePool = [
    ...catalogs.expressRoutes,
    ...catalogs.fastapiRoutes,
    ...catalogs.typescriptSymbols,
    ...catalogs.pythonSymbols,
  ];
  return FLOW_DEFINITIONS.map(([id, title, patterns]) => {
    const matches = sourcePool.filter((candidate) =>
      patterns.some((pattern) =>
        `${candidate.sourcePath} ${candidate.mountedPath ?? candidate.path ?? ''}`
          .toLowerCase()
          .includes(pattern.toLowerCase()),
      ),
    );
    const selected = (matches.length > 0 ? matches : sourcePool).slice(0, 8);
    const sources = selected.map((candidate) =>
      source(
        candidate.sourcePath,
        candidate.name ?? candidate.handler,
        candidate.lineStart,
        candidate.lineEnd,
      ),
    );
    const relations = selected
      .filter(
        (candidate) =>
          candidate.id &&
          (candidate.method || candidate.exported === true || candidate.public === true),
      )
      .slice(0, 12)
      .map((candidate) => ({ type: 'invokes', target: candidate.id }));
    return record(
      '08-flows',
      {
        id,
        kind: 'runtime-flow',
        title,
        status: 'inferred',
        inferenceRule:
          'Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence.',
        summary: `${title} workflow across ClinicOS components.`,
        boundedContexts: [contextFor(title)],
        sources,
        relations,
        tags: ['runtime-flow'],
        sections: {
          Inputs: 'Trigger-specific request, actor identity, and validated workflow payload.',
          Outputs: 'Workflow-specific response or persisted state transition.',
          Dependencies: text(relations.map((relation) => `\`${relation.target}\``)),
          'Side Effects':
            'See invoked endpoint and component units for exact writes and external calls.',
          Consumers:
            'Clinical users, frontend actions, automation, or deployment systems initiating the trigger.',
          Invariants:
            'Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.',
          'Failure Modes':
            'Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.',
          Sequence: [
            '| Step | Actor | Operation | State change | Failure branch |',
            '| --- | --- | --- | --- | --- |',
            ...selected
              .slice(0, 8)
              .map(
                (candidate, index) =>
                  `| ${index + 1} | ${index === 0 ? 'Trigger actor' : 'ClinicOS runtime'} | \`${candidate.id}\` | Defined by cited component | Owning component error contract |`,
              ),
          ].join('\n'),
        },
      },
      inventoryHash,
    );
  });
}

function findingUnits(catalogs, inventoryHash) {
  const findings = [];
  const directPersistenceRoutes = catalogs.expressRoutes.filter(
    (route) => (route.persistenceCalls ?? []).length > 0,
  );
  if (directPersistenceRoutes.length > 0) {
    findings.push(
      record(
        '11-quality/findings',
        {
          id: 'finding.coupling.express-route-direct-prisma-access',
          kind: 'architectural-finding',
          title: 'Express routes with direct Prisma access',
          summary: `${directPersistenceRoutes.length} Express endpoints invoke Prisma directly from route handlers.`,
          sources: directPersistenceRoutes
            .slice(0, 25)
            .map((route) =>
              source(route.sourcePath, route.routerSymbol, route.lineStart, route.lineEnd),
            ),
          relations: directPersistenceRoutes.slice(0, 100).map((route) => ({
            type: 'documents',
            target: route.id,
          })),
          tags: ['hidden-coupling', 'persistence'],
          sections: {
            Inputs: `${directPersistenceRoutes.length} routes with extracted Prisma calls.`,
            Outputs: 'Explicit route-to-persistence coupling map.',
            Dependencies: 'Express route handlers and the shared Prisma client.',
            'Side Effects': 'Route handlers directly read or mutate persistent state.',
            Consumers: 'Change-impact analysis for schema, transactions, and route behavior.',
            Invariants:
              'The finding describes observed coupling and does not prescribe a repository abstraction.',
            'Failure Modes':
              'Schema or transaction changes can require coordinated edits across multiple handlers.',
          },
        },
        inventoryHash,
      ),
    );
  }
  const unmounted = catalogs.expressRoutes.filter((route) => route.mountedPath === null);
  if (unmounted.length > 0) {
    findings.push(
      record(
        '11-quality/findings',
        {
          id: 'finding.coupling.unmounted-express-router',
          kind: 'architectural-finding',
          title: 'Unmounted Express router',
          summary: `${unmounted.length} route declarations are not mounted by the Express composition root.`,
          sources: unmounted.map((route) =>
            source(route.sourcePath, route.routerSymbol, route.lineStart, route.lineEnd),
          ),
          relations: unmounted.map((route) => ({ type: 'violates', target: route.id })),
          tags: ['coupling', 'route-mount'],
          sections: {
            Inputs: text(unmounted.map((route) => `\`${route.id}\``)),
            Outputs: 'Explicit route reachability finding.',
            Dependencies: 'Express route declarations and composition-root mount discovery.',
            'Side Effects':
              'The declared handler is unreachable through its intended router mount.',
            Consumers: 'Architecture impact analysis and route maintenance.',
            Invariants: 'A router-local declaration is not an exposed API unless mounted.',
            'Failure Modes':
              'Agents that inspect only the route file can incorrectly claim the endpoint is reachable.',
          },
        },
        inventoryHash,
      ),
    );
  }
  const zeroConsumerSymbols = catalogs.typescriptSymbols.filter(
    (symbol) => symbol.exported && !symbol.testSource && (symbol.consumers ?? []).length === 0,
  );
  if (zeroConsumerSymbols.length > 0) {
    findings.push(
      record(
        '11-quality/findings',
        {
          id: 'finding.abstraction.exported-symbols-without-observed-consumers',
          kind: 'architectural-finding',
          title: 'Exported symbols without observed consumers',
          status: 'inferred',
          inferenceRule:
            'The TypeScript compiler extraction found exported production symbols with no cross-file import consumers.',
          summary: `${zeroConsumerSymbols.length} exported symbols have no observed cross-file consumers.`,
          sources: zeroConsumerSymbols
            .slice(0, 25)
            .map((symbol) =>
              source(symbol.sourcePath, symbol.name, symbol.lineStart, symbol.lineEnd),
            ),
          relations: zeroConsumerSymbols.slice(0, 100).map((symbol) => ({
            type: 'documents',
            target: symbol.id,
          })),
          tags: ['dead-abstraction-candidate', 'consumer-analysis'],
          sections: {
            Inputs: `${zeroConsumerSymbols.length} exported production symbols.`,
            Outputs:
              'Candidate dead abstractions; exports used dynamically or externally require runtime confirmation.',
            Dependencies: 'Static TypeScript consumer graph.',
            'Side Effects': 'None observed',
            Consumers: 'Future refactoring and extension-point analysis.',
            Invariants: 'This is a static consumer finding, not a deletion recommendation.',
            'Failure Modes':
              'Dynamic loading, CLI invocation, tests outside the inventory, or framework discovery can be invisible to static imports.',
          },
        },
        inventoryHash,
      ),
    );
  }
  const providerSources = catalogs.pythonSymbols.filter(
    (symbol) =>
      symbol.public && /provider|registry|factory/i.test(`${symbol.name} ${symbol.sourcePath}`),
  );
  if (providerSources.length > 0) {
    findings.push(
      record(
        '11-quality/findings',
        {
          id: 'finding.extension.provider-registry',
          kind: 'extension-point',
          title: 'AI provider registry extension point',
          status: 'inferred',
          inferenceRule:
            'Public provider, registry, and factory symbols form a substitutable model-provider boundary.',
          summary:
            'Provider registry and factory contracts permit additional AI provider implementations.',
          sources: providerSources
            .slice(0, 12)
            .map((symbol) =>
              source(symbol.sourcePath, symbol.name, symbol.lineStart, symbol.lineEnd),
            ),
          relations: providerSources.slice(0, 25).map((symbol) => ({
            type: 'documents',
            target: symbol.id,
          })),
          tags: ['extension-point', 'ai-provider'],
          sections: {
            Inputs:
              'Provider name, model specification, credentials by environment, and runtime profile.',
            Outputs: 'Provider adapter satisfying the runtime model contract.',
            Dependencies: 'Provider registry, model specification, and factory components.',
            Consumers: 'Assistant and document-processing agents.',
            Invariants:
              'Supported providers are selected through explicit registry and configuration validation.',
            'Failure Modes':
              'Unknown providers or invalid model configuration fail during registry/factory resolution.',
          },
        },
        inventoryHash,
      ),
    );
  }
  return findings;
}

export function buildCoreKnowledge({ catalogs, inventory, inventoryHash }) {
  const records = [
    ...contractUnits(inventoryHash),
    ...systemUnits(catalogs, inventoryHash),
    ...projectUnits(catalogs, inventoryHash),
    ...contextUnits(catalogs, inventoryHash),
    ...dataUnits(catalogs, inventoryHash),
    ...publicComponents(catalogs, inventoryHash),
  ];
  return records
    .filter(
      (candidate, index, values) =>
        values.findIndex((record) => record.unit.id === candidate.unit.id) === index,
    )
    .sort((left, right) => left.unit.id.localeCompare(right.unit.id, 'en'));
}

export function buildOperationalKnowledge({ catalogs, inventory, inventoryHash }) {
  const records = [];
  const modelIds = new Set(catalogs.prismaModels.map((model) => model.name.toLowerCase()));
  for (const route of catalogs.expressRoutes) {
    addUnique(
      records,
      endpointUnit(route, 'express', catalogs.projects.projects, modelIds, inventoryHash),
    );
  }
  for (const route of catalogs.fastapiRoutes) {
    addUnique(
      records,
      endpointUnit(route, 'fastapi', catalogs.projects.projects, modelIds, inventoryHash),
    );
  }
  for (const configuration of catalogs.configuration) {
    addUnique(records, configurationUnit(configuration, inventoryHash));
  }
  for (const testSurface of catalogs.tests) {
    const projectId = projectForPath(testSurface.path, catalogs.projects.projects);
    addUnique(
      records,
      record(
        `11-quality/tests/${testSurface.type}`,
        {
          id: testSurface.id,
          kind: `${testSurface.type}-test`,
          title: basename(testSurface.path),
          summary: `${testSurface.framework} ${testSurface.type} test surface.`,
          sources: [source(testSurface.path)],
          relations: [{ type: 'belongs-to', target: projectId }],
          tags: ['test', testSurface.type, testSurface.framework],
          sections: {
            Inputs: `Test source: \`${testSurface.path}\`.`,
            Outputs: 'Objective pass/fail evidence for the behavior encoded in the test.',
            Dependencies: `Framework: \`${testSurface.framework}\`; owning project: \`${projectId}\`.`,
            'Side Effects':
              'May create isolated fixtures or exercise local runtime behavior as defined by the test.',
            Consumers: 'CI/CD, quality gates, maintainers, and autonomous QA agents.',
            Invariants:
              'A test is evidence only for assertions and execution paths it actually exercises.',
            'Failure Modes':
              'Assertion failure, fixture failure, unavailable dependency, timeout, or environment mismatch.',
          },
        },
        inventoryHash,
      ),
    );
  }
  for (const script of catalogs.projects.packageScripts) {
    addUnique(
      records,
      record(
        '12-repository/scripts',
        {
          id: script.id,
          kind: 'package-script',
          title: `${script.packageName ?? 'repository'}:${script.name}`,
          summary: `Package script ${script.name} executes ${script.command}.`,
          sources: [source(script.sourcePath, script.name)],
          relations: [{ type: 'belongs-to', target: 'project.repository-automation' }],
          tags: ['package-script'],
          sections: {
            Inputs: `Command invocation: \`${script.name}\`.`,
            Outputs: `Executable command: \`${script.command}\`.`,
            Dependencies: `Package manifest: \`${script.sourcePath}\`.`,
            'Side Effects': 'Defined by the invoked command and its subprocesses.',
            Consumers: 'Developers, CI/CD workflows, deployment platforms, and autonomous agents.',
            Invariants: 'The manifest command is authoritative for this script name.',
            'Failure Modes':
              'Non-zero command exit, missing dependency, invalid configuration, or unavailable external service.',
          },
        },
        inventoryHash,
      ),
    );
  }
  for (const workflow of catalogs.projects.workflows) {
    addUnique(
      records,
      record(
        '10-infrastructure/ci-cd',
        {
          id: workflow.id,
          kind: 'ci-workflow',
          title: workflow.name,
          summary: `GitHub Actions workflow with jobs ${workflow.jobs.join(', ')}.`,
          sources: [source(workflow.path)],
          relations: [{ type: 'belongs-to', target: 'system.clinicos' }],
          tags: ['github-actions', 'ci-cd'],
          sections: {
            Inputs: `Triggers: ${json(workflow.triggers)}; secret names only: ${json(workflow.secretNames)}.`,
            Outputs: `Jobs: ${json(workflow.jobs)}.`,
            Dependencies: text(workflow.commands.map((command) => `\`${command}\``)),
            'Side Effects':
              'May build, test, migrate, publish, or deploy according to workflow jobs.',
            Consumers: 'GitHub event processing and deployment governance.',
            Invariants:
              'Secret values are never represented; only referenced secret names are indexed.',
            'Failure Modes':
              'Job command failure, missing secret, unavailable runner, failed check, or deployment error.',
          },
        },
        inventoryHash,
      ),
    );
  }
  for (const item of [
    ...catalogs.projects.containers,
    ...catalogs.projects.deployments,
    ...catalogs.projects.requirements,
  ]) {
    const itemSource = item.sourcePath ?? item.path;
    addUnique(
      records,
      record(
        item.id.startsWith('integration.container')
          ? '10-infrastructure/containers'
          : item.id.startsWith('integration.')
            ? '10-infrastructure/deployments'
            : '12-repository/requirements',
        {
          id: item.id,
          kind: item.id.startsWith('integration.') ? 'integration' : 'requirement',
          title: item.name ?? item.requirementId ?? item.id,
          status: item.id.startsWith('component.repository.requirement') ? 'declared' : 'observed',
          summary: `${item.id} declared by ${itemSource}.`,
          sources: [
            source(
              itemSource,
              undefined,
              undefined,
              undefined,
              item.id.startsWith('component.repository.requirement') ? 'declared' : 'observed',
            ),
          ],
          relations: [{ type: 'belongs-to', target: 'system.clinicos' }],
          tags: ['infrastructure'],
          sections: {
            Inputs: json(item.ports ?? item.platform ?? item.requirementId),
            Outputs: json(item.image ?? item.startCommand ?? item.healthcheckPath),
            Dependencies: json(item.volumes ?? []),
            'Side Effects': 'Defined by the cited infrastructure or requirement source.',
            Consumers: 'Runtime deployment, local development, or governance automation.',
            Invariants:
              'Executable deployment configuration outranks narrative deployment documentation.',
            'Failure Modes':
              'Configuration drift, unavailable platform, failed health check, or unmet declared requirement.',
          },
        },
        inventoryHash,
      ),
    );
  }
  for (const flow of flowUnits(catalogs, inventoryHash)) addUnique(records, flow);
  for (const finding of findingUnits(catalogs, inventoryHash)) addUnique(records, finding);

  const representedPaths = new Set(
    records.flatMap((candidate) => [
      candidate.path,
      ...candidate.unit.sources.map((item) => item.path),
    ]),
  );
  for (const item of inventory.filter(
    (candidate) =>
      candidate.pathType === 'file' &&
      !['metadata-only', 'generated-excluded'].includes(candidate.classification) &&
      !candidate.path.startsWith('docs/nhw/') &&
      !representedPaths.has(candidate.path),
  )) {
    addUnique(records, repositoryUnit(item, inventoryHash));
  }
  return records.sort((left, right) => left.unit.id.localeCompare(right.unit.id, 'en'));
}
