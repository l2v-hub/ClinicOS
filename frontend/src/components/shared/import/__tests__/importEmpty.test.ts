import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImportEmptyStart, hasImportContent, importFileGuidance } from '../ImportEmptyStart';
import { job } from './fixtures';

// Match the existing node:test classic-JSX harness without changing app configuration.
Object.assign(globalThis, { React });

test('default and additional empty letters do not constitute saved content', () => {
  const value = job();
  assert.equal(hasImportContent(value), false);
  value.manifest.groups.push({ ...value.manifest.groups[0], id: 'empty-second' });
  assert.equal(hasImportContent(value), false);
});

test('saved global pages or originals retain management regardless of current empty letter', () => {
  assert.equal(
    hasImportContent({ ...job(), manifest: { ...job().manifest, pages: [{} as never] } }),
    true,
  );
  assert.equal(hasImportContent({ ...job(), documents: [{} as never] }), true);
});

test('guidance describes authoritative formats and all limits before choosing a file', () => {
  const limits = {
    ...job().limits,
    maxPages: 7,
    maxSourceFiles: 4,
    maxGroups: 3,
    maxFileBytes: 2 * 1024 * 1024,
    maxTotalBytes: 5 * 1024 * 1024,
    acceptedMimeTypes: ['application/pdf', 'image/png'],
  };
  const text = importFileGuidance(limits);
  for (const expected of [
    'PDF',
    'PNG',
    '7 pagine',
    '4 file',
    '3 lettere',
    '2 MB per file',
    '5 MB complessivi',
  ])
    assert.ok(text.includes(expected), expected);
  assert.doesNotMatch(text, /JPEG|HEIC|Word|progressivo|0 \/|30/);
  assert.match(importFileGuidance({ ...limits, acceptedMimeTypes: ['image/jpeg'] }), /JPEG/);
  assert.match(
    importFileGuidance({ ...limits, acceptedMimeTypes: ['application/x-custom'] }),
    /application\/x-custom/,
  );
});

test('empty panel has one primary load action, scan alternative, and no objectless controls', () => {
  const html = renderToStaticMarkup(
    React.createElement(ImportEmptyStart, {
      limits: job().limits,
      disabled: false,
      onUpload() {},
      onScan() {},
    }),
  );
  assert.match(html, /class="btn-primary"[^>]*>Carica documento/);
  assert.match(html, /class="btn-secondary"[^>]*data-testid="scatta-foto"[^>]*>Scansiona/);
  assert.match(html, /PDF, JPEG, PNG/);
  assert.doesNotMatch(html, /Rinomina|tablist|Avvia elaborazione|0 \/|Lettera precedente/);
});

test('busy first upload disables acquisition without removing its guidance', () => {
  const html = renderToStaticMarkup(
    React.createElement(ImportEmptyStart, {
      limits: job().limits,
      disabled: true,
      onUpload() {},
      onScan() {},
    }),
  );
  assert.equal((html.match(/disabled=""/g) || []).length, 2);
  assert.match(html, /Carica documento/);
  assert.match(html, /25 MB per file/);
});
