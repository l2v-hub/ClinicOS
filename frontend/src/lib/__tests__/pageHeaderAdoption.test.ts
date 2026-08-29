import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageHeader = readFileSync(
  new URL('../../components/shared/PageHeader.tsx', import.meta.url),
  'utf8',
);
const consegne = readFileSync(
  new URL('../../components/operator/ConsegnePage.tsx', import.meta.url),
  'utf8',
);
const notes = readFileSync(
  new URL('../../components/shared/NotesPage.tsx', import.meta.url),
  'utf8',
);

test('canonical page header accepts semantic subtitle content', () => {
  assert.match(pageHeader, /subtitle\?: ReactNode/);
  assert.match(pageHeader, /<p className="page-header__subtitle">{subtitle}<\/p>/);
});

test('handover and notes use the same canonical heading hierarchy', () => {
  for (const source of [consegne, notes]) {
    assert.match(source, /<PageHeader/);
    assert.doesNotMatch(source, /className="view-header"/);
  }
  assert.match(consegne, /\{ label: 'ClinicOS' \}, \{ label: 'Consegne' \}/);
  assert.match(notes, /\{ label: 'ClinicOS' \}, \{ label: 'Note' \}/);
});

test('header creation actions expose their controlled panel state', () => {
  assert.match(consegne, /aria-expanded=\{formAperto\}/);
  assert.match(consegne, /aria-controls="nuova-consegna-panel"/);
  assert.match(consegne, /id="nuova-consegna-panel"/);
  assert.match(notes, /aria-expanded=\{formAperto\}/);
  assert.match(notes, /aria-controls="nuova-nota-panel"/);
  assert.match(notes, /id="nuova-nota-panel"/);
});
