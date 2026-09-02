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
const appCss = readFileSync(new URL('../../App.css', import.meta.url), 'utf8');

test('App login has no unbounded patient roster state or request', () => {
  assert.doesNotMatch(appSource, /useState<Paziente\[\]>/);
  assert.doesNotMatch(appSource, /fetch\(`\$\{API_URL\}\/patients`,/);
  assert.match(appSource, /patients\/clinical-summary\/overview/);
});

test('multi-patient parameters uses one bounded page instead of cartella fan-out', () => {
  assert.match(parametersApiSource, /patients\/parameters\/page/);
  assert.match(parametersSource, /limit:\s*25/);
  assert.doesNotMatch(parametersSource, /Promise\.all/);
  assert.match(parametersSource, /pageRequestGuard/);
  assert.match(parametersSource, /guard\.isCurrent\(request\)/);
  assert.match(parametersSource, /cartellePerPaziente = useMemo/);
  assert.match(parametersSource, /cartellePerPaziente\.get\(pazienteId\)/);
  assert.doesNotMatch(parametersSource, /cartelle\.find/);
});

test('multi-patient quick entry exposes every action and field to assistive technology', () => {
  for (const accessibleName of [
    /aria-label={`PA per \$\{patientName\}`}/,
    /aria-label={`SpO2 per \$\{patientName\}`}/,
    /aria-label={`Frequenza cardiaca per \$\{patientName\}`}/,
    /aria-label={`Temperatura corporea per \$\{patientName\}`}/,
    /aria-label={`Glicemia DTX per \$\{patientName\}`}/,
    /aria-label={`Evacuazione per \$\{patientName\}`}/,
    /aria-label={`Salva parametri per \$\{patientName\}`}/,
    /aria-label="Cerca paziente per nome, MRN o camera"/,
  ]) {
    assert.match(parametersSource, accessibleName);
  }
  assert.doesNotMatch(parametersSource, /tabIndex=\{isNoteOpen \? 0 : -1\}/);
  assert.match(
    parametersSource,
    /requestAnimationFrame\(\(\) => noteButtonRef\.current\?\.focus\(\)\)/,
  );
});

test('multi-patient quick entry reuses the ClinicOS form and action design system', () => {
  assert.match(parametersSource, /className="form-input qe-row__input qe-row__input--wide"/);
  assert.match(parametersSource, /'form-input qe-row__input'/);
  assert.match(parametersSource, /'btn-secondary qe-row__note-btn'/);
  assert.match(parametersSource, /className="btn-success qe-row__save"/);
  assert.match(parametersSource, /className="form-input qe-row__note-textarea"/);
  assert.match(parametersSource, /PA · mmHg/);
  assert.match(parametersSource, /SpO₂ · %/);
  assert.match(parametersSource, /TC · °C/);
  assert.doesNotMatch(parametersSource, /\{paziente\.lastName\}, \{paziente\.firstName\}/);
  assert.match(appCss, /\.qe-row__input[\s\S]*font-family: var\(--font-ui\)/);
  assert.match(appCss, /\.qe-row__input[\s\S]*font-size: 14px/);
  assert.match(appCss, /\.qe-row__input:focus-visible[\s\S]*box-shadow: var\(--shadow-focus\)/);
});

test('a single parameters table is always visible and uses the operational table contract', () => {
  assert.doesNotMatch(parametersSource, /ClinicalTableSection|cts__/);
  assert.match(parametersSource, /className="qe-section qe-table-surface"/);
  assert.match(parametersSource, /Inserimento parametri per \$\{filtrati\.length\} pazienti/);
  assert.match(appCss, /--operational-table-radius: 12px/);
  assert.match(
    appCss,
    /\.qe-table-surface\s*\{[\s\S]*border-radius: var\(--operational-table-radius\)/,
  );
  assert.match(appCss, /\.qe-row\s*\{[\s\S]*min-height: var\(--operational-table-row-min-h\)/);
  assert.match(appCss, /\.qe-row--header\s*\{[\s\S]*var\(--operational-table-header-h\)/);
  assert.match(
    appCss,
    /\.qe-row__patient:focus-visible\s*\{[\s\S]*outline: 2px solid var\(--blue\)/,
  );
});

test('multi-patient refresh keeps the previous roster visible and announces progress', () => {
  assert.match(parametersSource, /function updateRicerca[\s\S]*setLoading\(true\)/);
  assert.match(parametersSource, /onChange=\{\(e\) => updateRicerca\(e\.target\.value\)\}/);
  assert.match(parametersSource, /loading && pazienti\.length === 0/);
  assert.match(parametersSource, /className="qe-list" aria-busy=\{loading\}/);
  assert.match(parametersSource, /Aggiornamento elenco…/);
  assert.match(parametersSource, /disabled=\{loadingMore \|\| loading\}/);
  assert.doesNotMatch(parametersSource, /setItems\(\[\]\)/);
});

test('multi-patient mobile layout is a labelled two-column card without horizontal scroll', () => {
  assert.match(parametersSource, /className="qe-row__mobile-label"/);
  assert.match(parametersSource, /className="qe-section qe-table-surface"/);
  assert.match(appCss, /@media \(max-width: 768px\)/);
  assert.match(appCss, /\.qe-table-surface\s*\{\s*overflow-x: hidden/);
  assert.match(appCss, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(appCss, /\.qe-row__mobile-label\s*\{\s*display: block/);
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
