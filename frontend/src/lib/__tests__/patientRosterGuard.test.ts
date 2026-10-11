import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createLatestRequestGuard } from '../usePatientDirectorySearch';

const appSource = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const parametersSource = readFileSync(
  new URL('../../components/operator/MultiPatientParametri.tsx', import.meta.url),
  'utf8',
);
const parametersApiSource = readFileSync(
  new URL('../patientParametersPage.ts', import.meta.url),
  'utf8',
);
const parameterPanel = readFileSync(
  new URL('../../components/operator/ParameterEntryPanel.tsx', import.meta.url),
  'utf8',
);
const parameterForm = readFileSync(
  new URL('../../components/operator/ParameterReadingForm.tsx', import.meta.url),
  'utf8',
);
const parameterCss = readFileSync(
  new URL('../../components/operator/ParametriVitali.css', import.meta.url),
  'utf8',
);

test('App login has no unbounded patient roster state or request', () => {
  assert.doesNotMatch(appSource, /useState<Paziente\[\]>/);
  assert.doesNotMatch(appSource, /fetch\(`\$\{API_URL\}\/patients`,/);
  assert.match(appSource, /patients\/clinical-summary\/overview/);
});

test('multi-patient parameters loads bounded pages without individual chart fan-out and rejects stale responses', () => {
  assert.match(parametersApiSource, /patients\/parameters\/page/);
  assert.match(parametersSource, /limit:\s*25/);
  assert.doesNotMatch(parametersSource, /Promise\.all|cartelle\.find|fetchPatientCartella/);
  assert.match(parametersSource, /version !== generation\.current/);
  assert.match(parametersSource, /controller\.signal\.aborted/);
  assert.match(parametersSource, /controller\.abort\(\)/);
  assert.match(parametersSource, /mergePatientParametersPage/);
});

test('selected patient form labels every field and retains the named patient outside filtered results', () => {
  assert.match(parametersSource, /aria-label="Cerca paziente per nome o camera"/);
  assert.match(parameterPanel, /aria-label={`Rilevazione di \$\{name\}`}/);
  assert.match(parameterPanel, /non è nei risultati della ricerca: questa rilevazione resta sua/);
  assert.match(parameterForm, /htmlFor=\{id\}/);
  assert.match(parameterForm, /'aria-label': `Nuova rilevazione \$\{field\.label\}`/);
  assert.match(parametersSource, /outsideResults=\{selectedOutside\}/);
  assert.match(
    parametersSource,
    /onSave=\{\(request\) => save\(selectedItem\.patient\.id, request\)\}/,
  );
});

test('both parameter workspaces reuse the shared form and canonical controls with units', () => {
  assert.match(parametersSource, /<ParameterEntryPanel/);
  assert.match(parameterPanel, /<ParameterReadingForm/);
  assert.match(parameterForm, /className: 'form-input'/);
  assert.match(parameterForm, /className="ds-btn ds-btn--secondary"/);
  assert.match(parameterForm, /ENTRY_FIELDS\.map/);
  assert.match(parameterForm, /field\.unit/);
});

test('patient picker is a labelled list separate from the selected patient form', () => {
  assert.match(parametersSource, /<section className="par-patients" aria-label="Pazienti"/);
  assert.match(parametersSource, /<ul className="par-plist" aria-busy=\{loading\}/);
  assert.match(parametersSource, /<ParameterPatientPick/);
  assert.match(parametersSource, /selected=\{item\.patient\.id === selectedItem\?\.patient\.id\}/);
  assert.doesNotMatch(parametersSource, /qe-row|qe-table-surface/);
});

test('multi-patient refresh keeps the roster and draft visible and announces summary progress', () => {
  assert.match(parametersSource, /setLoading\(itemsRef\.current\.length === 0\)/);
  assert.match(parametersSource, /Aggiornamento rilevazioni di oggi…/);
  assert.match(parametersSource, /role="status"/);
  assert.match(parametersSource, /disabled=\{loading \|\| loadingMore \|\| summaryLoading\}/);
  assert.match(parametersSource, /draftStore=\{draftStore\}/);
  assert.doesNotMatch(parametersSource, /setItems\(\[\]\)/);
});

test('mobile parameter layout stacks patient list and form and bounds roster height', () => {
  assert.match(parameterCss, /@media \(max-width: 699px\)/);
  assert.match(parameterCss, /grid-template-areas: 'list' 'form'/);
  assert.match(parameterCss, /max-height: 40vh/);
  assert.match(parameterCss, /overflow-y: auto/);
  assert.match(parameterForm, /<label[\s\S]*htmlFor=\{id\}/);
});

test('directory search rejects a stale response even when fetch ignores abort', () => {
  const guard = createLatestRequestGuard();
  const first = guard.start();
  const second = guard.start();
  const committed: string[] = [];
  if (guard.isCurrent(first)) committed.push('stale');
  if (guard.isCurrent(second)) committed.push('latest');
  assert.deepEqual(committed, ['latest']);
  guard.invalidate(second);
  assert.equal(guard.isCurrent(second), false);
});

test('logout clears clinical, search and assistant state before another session', () => {
  for (const cleanup of [
    /setCartelle\(\[\]\)/,
    /setAppuntamenti\(\[\]\)/,
    /setConsegne\(\[\]\)/,
    /setSearchQuery\(''\)/,
    /setPazientiRicerca\(''\)/,
    /setAiLoaded\(false\)/,
    /patientNavigationSequenceRef\.current \+= 1/,
    /sessionEpoch !== patientNavigationSequenceRef\.current/,
    /sessionEpochRef\.current \+= 1/,
    /sessionEpoch === sessionEpochRef\.current/,
    /request !== patientNavigationSequenceRef\.current/,
  ]) {
    assert.match(appSource, cleanup);
  }
});
