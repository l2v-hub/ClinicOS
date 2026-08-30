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
const operatorAgenda = readFileSync(
  new URL('../../components/operator/OperatorAgenda.tsx', import.meta.url),
  'utf8',
);
const agendaStyles = readFileSync(new URL('../../app-additions.css', import.meta.url), 'utf8');

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

test('operator agenda uses the canonical heading while preserving accessible controls', () => {
  assert.match(operatorAgenda, /<PageHeader/);
  assert.match(operatorAgenda, /title="Agenda operatore"/);
  assert.match(operatorAgenda, /\{ label: 'ClinicOS' \}, \{ label: 'Agenda' \}/);
  assert.doesNotMatch(operatorAgenda, /<div className="agt-header">/);
  assert.match(operatorAgenda, /role="group" aria-label="Visualizzazione agenda"/);
  assert.match(operatorAgenda, /aria-pressed=\{view === v\}/);
  assert.match(operatorAgenda, /aria-label="Intervallo precedente"/);
  assert.match(operatorAgenda, /aria-label="Vai a oggi"/);
  assert.match(operatorAgenda, /aria-label="Intervallo successivo"/);
});

test('operator agenda actions stack without overflow on narrow screens', () => {
  const mobile = agendaStyles.split('@media (max-width: 600px)')[1]?.split('/* ── Filter chips')[0];
  assert.ok(mobile);
  assert.match(mobile, /\.agt-page-actions\s*\{[\s\S]*?width: 100%/);
  assert.match(mobile, /flex-direction: column/);
  assert.match(mobile, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(mobile, /\.agt-view-btn\s*\{[\s\S]*?min-height: 44px/);
  assert.match(mobile, /\.agt-today-btn\s*\{[\s\S]*?min-height: 44px/);
});
