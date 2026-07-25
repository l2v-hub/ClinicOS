import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REQUIRED_HEADINGS,
  parseKnowledgeUnit,
  renderKnowledgeUnit,
  validateKnowledgeUnits,
} from '../lib/markdown.mjs';
import { compileGraph, detectCycles, findOrphans, resolveRedirect } from '../lib/graph.mjs';

function unit(overrides = {}) {
  return {
    path: overrides.path ?? 'docs/nhw/04-components/component.alpha.md',
    id: overrides.id ?? 'component.fixture.alpha',
    kind: overrides.kind ?? 'component',
    title: overrides.title ?? 'Alpha',
    status: overrides.status ?? 'observed',
    summary: overrides.summary ?? 'Fixture component.',
    boundedContexts: overrides.boundedContexts ?? ['context.fixture'],
    sources: overrides.sources ?? [
      {
        path: 'src/alpha.ts',
        symbol: 'alpha',
        line_start: 1,
        line_end: 2,
        file_hash: 'a'.repeat(64),
        confidence: 'observed',
      },
    ],
    relations: overrides.relations ?? [],
    tags: overrides.tags ?? ['fixture'],
    lastVerified: overrides.lastVerified ?? {
      commit: 'working-tree',
      inventory_hash: 'b'.repeat(64),
    },
    inferenceRule: overrides.inferenceRule,
    sections:
      overrides.sections ??
      Object.fromEntries(
        REQUIRED_HEADINGS.map((heading) => [
          heading,
          heading === 'Canonical Definition' ? 'Alpha canonical definition.' : 'None observed',
        ]),
      ),
  };
}

test('parses and byte-stably renders the complete Markdown knowledge-unit contract', () => {
  const expected = unit({
    relations: [
      {
        type: 'depends-on',
        target: 'component.fixture.beta',
        evidence: ['src/alpha.ts:1'],
        confidence: 'observed',
      },
    ],
  });

  const rendered = renderKnowledgeUnit(expected);
  const parsed = parseKnowledgeUnit(expected.path, rendered);
  const rerendered = renderKnowledgeUnit(parsed);

  assert.equal(parsed.id, expected.id);
  assert.deepEqual(parsed.boundedContexts, ['context.fixture']);
  assert.equal(parsed.sources[0].symbol, 'alpha');
  assert.equal(parsed.relations[0].target, 'component.fixture.beta');
  assert.deepEqual(Object.keys(parsed.sections), REQUIRED_HEADINGS);
  assert.equal(rerendered, rendered);
  assert.equal(rendered.includes('\r'), false);
});

test('rejects missing headings and inferred claims without an inference rule', () => {
  const missing = unit();
  delete missing.sections.Evidence;
  assert.throws(() => renderKnowledgeUnit(missing), { code: 'NHW_MISSING_HEADING' });

  assert.throws(() => renderKnowledgeUnit(unit({ status: 'inferred', inferenceRule: undefined })), {
    code: 'NHW_MISSING_INFERENCE_RULE',
  });
});

test('rejects duplicate keys, unknown fields, aliases, and executable YAML tags', () => {
  const rendered = renderKnowledgeUnit(unit());
  assert.throws(
    () =>
      parseKnowledgeUnit(
        'duplicate.md',
        rendered.replace('kind: "component"', 'id: "component.fixture.other"\nkind: "component"'),
      ),
    { code: 'NHW_DUPLICATE_FRONTMATTER_KEY' },
  );
  assert.throws(
    () =>
      parseKnowledgeUnit(
        'unknown.md',
        rendered.replace('kind: "component"', 'unknown: "value"\nkind: "component"'),
      ),
    { code: 'NHW_UNKNOWN_FRONTMATTER_FIELD' },
  );
  assert.throws(
    () => parseKnowledgeUnit('alias.md', rendered.replace('tags:\n  - "fixture"', 'tags: *shared')),
    { code: 'NHW_UNSAFE_FRONTMATTER' },
  );
  assert.throws(
    () =>
      parseKnowledgeUnit(
        'tag.md',
        rendered.replace('tags:\n  - "fixture"', 'tags: !include value'),
      ),
    { code: 'NHW_UNSAFE_FRONTMATTER' },
  );
});

test('detects duplicate canonical definitions', () => {
  const first = unit();
  const second = unit({
    id: 'component.fixture.beta',
    path: 'docs/nhw/04-components/component.beta.md',
  });
  second.sections['Canonical Definition'] = first.sections['Canonical Definition'];

  const errors = validateKnowledgeUnits([first, second]);
  assert.ok(errors.some((error) => error.code === 'NHW_DUPLICATE_DEFINITION'));
});

test('compiles typed relations, resolves redirects, and detects exact cycles without orphans', () => {
  const alpha = unit({
    relations: [
      {
        type: 'depends-on',
        target: 'component.fixture.beta',
        evidence: ['src/alpha.ts:1'],
        confidence: 'observed',
      },
    ],
  });
  const beta = unit({
    id: 'component.fixture.beta',
    path: 'docs/nhw/04-components/component.beta.md',
    sources: [{ path: 'src/beta.ts', confidence: 'observed' }],
    relations: [
      {
        type: 'depends-on',
        target: 'component.fixture.gamma',
        evidence: ['src/beta.ts:1'],
        confidence: 'observed',
      },
    ],
  });
  const gamma = unit({
    id: 'component.fixture.gamma',
    path: 'docs/nhw/04-components/component.gamma.md',
    sources: [{ path: 'src/gamma.ts', confidence: 'observed' }],
    relations: [
      {
        type: 'depends-on',
        target: 'component.fixture.alpha',
        evidence: ['src/gamma.ts:1'],
        confidence: 'observed',
      },
    ],
  });
  const graph = compileGraph([alpha, beta, gamma], []);

  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.edges.length, 3);
  assert.deepEqual(detectCycles(graph)[0].path, [
    'component.fixture.alpha',
    'component.fixture.beta',
    'component.fixture.gamma',
    'component.fixture.alpha',
  ]);
  assert.deepEqual(findOrphans(graph), []);
  assert.equal(
    resolveRedirect('component.fixture.old-alpha', {
      'component.fixture.old-alpha': 'component.fixture.alpha',
    }),
    'component.fixture.alpha',
  );
});
