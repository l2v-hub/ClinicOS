import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import { loadAllDiaryPages } from '../diaryPages';

const originalFetch = globalThis.fetch;
const headerUrl = new URL('../../components/operator/PatientCompactHeader.tsx', import.meta.url);
const dialogUrl = new URL(
  '../../components/operator/PatientRecordPrintDialog.tsx',
  import.meta.url,
);
const documentUrl = new URL(
  '../../components/operator/PatientRecordPrintDocument.tsx',
  import.meta.url,
);
const registryUrl = new URL(
  '../../components/operator/patientRecordPrintSections.ts',
  import.meta.url,
);
const patientDetailUrl = new URL('../../components/operator/PatientDetail.tsx', import.meta.url);
const stylesUrl = new URL('../../app-additions.css', import.meta.url);

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('global patient print always opens the selective dialog instead of printing the active tab', async () => {
  const [header, detail] = await Promise.all([
    readFile(headerUrl, 'utf8'),
    readFile(patientDetailUrl, 'utf8'),
  ]);
  assert.match(header, /onPrint\?: \(\) => void/);
  assert.match(header, /onClick=\{onPrint\}/);
  assert.doesNotMatch(header, /window\.print\(\)/);
  assert.match(detail, /onPrint=\{\(\) => setShowPrintDialog\(true\)\}/);
  assert.match(detail, /<PatientRecordPrintDialog/);
});

test('print dialog supports all or subset selection and blocks incomplete output', async () => {
  const [source, registry, document] = await Promise.all([
    readFile(dialogUrl, 'utf8'),
    readFile(registryUrl, 'utf8'),
    readFile(documentUrl, 'utf8'),
  ]);
  assert.match(source, /<AccessibleDialogSurface/);
  assert.match(source, />Tutte le sezioni</);
  assert.equal((registry.match(/id: '[a-z]+'/g) ?? []).length, 6);
  assert.match(source, /if \(next\.has\(id\)\) next\.delete\(id\)/);
  assert.match(source, /disabled=\{selected\.size === 0 \|\| printBlocked\}/);
  assert.match(source, /loadAllTherapyPages\(paziente\.id\)/);
  assert.match(source, /loadAllDiaryPages\(paziente\.id, controller\.signal\)/);
  assert.match(source, /document\.body\.classList\.add\('patient-record-printing'\)/);
  assert.match(source, /window\.print\(\)/);
  assert.match(source, /finally \{[\s\S]*classList\.remove\('patient-record-printing'\)/);
  assert.match(source, /<PatientRecordPrintDocument/);
  assert.match(document, /selected\.has\('profilo'\)/);
  assert.match(document, /selected\.has\('documenti'\)/);
});

test('selective print has a dedicated responsive dialog and isolated A4 document', async () => {
  const styles = await readFile(stylesUrl, 'utf8');
  assert.match(styles, /\.patient-print-dialog__sections\s*\{[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(
    styles,
    /@media \(max-width: 640px\)[\s\S]*\.patient-print-dialog__sections\s*\{[\s\S]*minmax\(0, 1fr\)/,
  );
  assert.match(
    styles,
    /body\.patient-record-printing \.patient-record-view > \*:not\(\.patient-record-print\)/,
  );
  assert.match(
    styles,
    /body\.patient-record-printing \.patient-record-print\s*\{[\s\S]*position: static !important/,
  );
  assert.match(styles, /@page\s*\{[\s\S]*size: A4/);
});

test('diary print loader follows every bounded page and deduplicates entries', async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    const second = url.includes('cursor=next-page');
    return new Response(
      JSON.stringify(
        second
          ? { entries: [{ id: 'b' }, { id: 'c' }], hasMore: false, nextCursor: null }
          : { entries: [{ id: 'a' }, { id: 'b' }], hasMore: true, nextCursor: 'next-page' },
      ),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  const entries = await loadAllDiaryPages('patient/a');
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ['a', 'b', 'c'],
  );
  assert.equal(urls.length, 2);
  assert.ok(urls.every((url) => url.includes('patient%2Fa/diary?limit=100')));
});
