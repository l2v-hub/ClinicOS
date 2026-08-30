import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildOperatorDirectoryPageUrl,
  mergeOperatorDirectoryPages,
  parseOperatorDirectoryPage,
} from '../operatorDirectoryPage.js';

test('operator directory URL selects the bounded role-specific page and cursor', () => {
  assert.equal(
    buildOperatorDirectoryPageUrl('https://api.example', true),
    'https://api.example/operators/page?limit=100',
  );
  assert.equal(
    buildOperatorDirectoryPageUrl('https://api.example', false, 'next/value', '  mario rossi '),
    'https://api.example/operators/directory/page?limit=100&cursor=next%2Fvalue&q=mario+rossi',
  );
  assert.equal(
    buildOperatorDirectoryPageUrl('https://api.example', true, null, '  mario rossi ', 'inactive'),
    'https://api.example/operators/page?limit=100&q=mario+rossi&status=inactive',
  );
  assert.equal(
    buildOperatorDirectoryPageUrl('https://api.example', false, null, '', 'inactive'),
    'https://api.example/operators/directory/page?limit=100',
  );
});

test('operator directory pages require coherent page metadata', () => {
  assert.deepEqual(
    parseOperatorDirectoryPage({
      items: [{ id: 'one' }],
      summary: { total: 12, active: 10, matching: 2, appointmentsToday: 4 },
      pageInfo: { hasMore: false, nextCursor: null },
    }),
    {
      items: [{ id: 'one' }],
      summary: { total: 12, active: 10, matching: 2, appointmentsToday: 4 },
      pageInfo: { hasMore: false, nextCursor: null },
    },
  );
  assert.throws(() => parseOperatorDirectoryPage([]));
  assert.deepEqual(
    parseOperatorDirectoryPage({
      items: [],
      pageInfo: { hasMore: false, nextCursor: null },
    }),
    { items: [], summary: null, pageInfo: { hasMore: false, nextCursor: null } },
  );
  assert.throws(() =>
    parseOperatorDirectoryPage({ items: [], pageInfo: { hasMore: true, nextCursor: null } }),
  );
  assert.throws(() =>
    parseOperatorDirectoryPage({
      items: [],
      summary: { total: 1, active: 2, matching: 1, appointmentsToday: 0 },
      pageInfo: { hasMore: false, nextCursor: null },
    }),
  );
});

test('operator page merge preserves order and replaces duplicate identities', () => {
  assert.deepEqual(
    mergeOperatorDirectoryPages(
      [
        { id: 'one', name: 'old' },
        { id: 'two', name: 'two' },
      ],
      [
        { id: 'two', name: 'new' },
        { id: 'three', name: 'three' },
      ],
    ),
    [
      { id: 'one', name: 'old' },
      { id: 'two', name: 'new' },
      { id: 'three', name: 'three' },
    ],
  );
});

test('management search and append retry are wired to the server page contract', () => {
  const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
  const management = readFileSync(
    new URL('../../components/admin/OperatorManagement.tsx', import.meta.url),
    'utf8',
  );
  assert.match(app, /buildOperatorDirectoryPageUrl\([\s\S]*operatorDirectoryQueryRef\.current/);
  assert.match(app, /operatorDirectoryRetryCursor/);
  assert.match(
    app,
    /if \(!cursor\) \{[\s\S]*setOperatorDirectoryPageInfo\(\{ hasMore: false, nextCursor: null \}\)/,
  );
  assert.match(app, /if \(!cursor\) setOperatorDirectorySummary\(page\.summary\)/);
  assert.match(app, /onSearch=\{searchOperatorDirectory\}/);
  assert.match(app, /onStatusChange=\{filterOperatorDirectoryByStatus\}/);
  assert.match(management, /onSearch\?\.\(ricerca\.trim\(\)\)/);
  assert.match(management, /onStatusChange\?\./);
  assert.match(management, /count=\{summary\?\.matching \?\? operatori\.length\}/);
});
