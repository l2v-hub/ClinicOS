import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const patientDetail = readFileSync(
  new URL('../../components/operator/PatientDetail.tsx', import.meta.url),
  'utf8',
);
const topNav = readFileSync(
  new URL('../../components/navigation/TopNav.tsx', import.meta.url),
  'utf8',
);
const topNavStyles = readFileSync(
  new URL('../../components/navigation/TopNav.css', import.meta.url),
  'utf8',
);
const appStyles = readFileSync(new URL('../../app-additions.css', import.meta.url), 'utf8');
const dataStyles = readFileSync(
  new URL('../../components/operator/PatientRecordData.css', import.meta.url),
  'utf8',
);
const therapyTab = readFileSync(
  new URL('../../components/operator/cartella/TerapiaFarmacologicaTab.tsx', import.meta.url),
  'utf8',
);

test('patient record exposes a labelled two-level navigation and controlled tab panel', () => {
  assert.match(patientDetail, /ariaLabel="Aree della cartella paziente"/);
  assert.match(patientDetail, /visualLabel="Aree cartella"/);
  assert.match(patientDetail, /className="top-nav--section-grid"/);
  assert.doesNotMatch(patientDetail, /visualLabel=\{`\$\{grp\.label\} · contenuti`\}/);
  assert.match(patientDetail, /ariaLabel="Sezioni del profilo paziente"/);
  assert.doesNotMatch(patientDetail, /visualLabel="Dettagli profilo"/);
  assert.match(patientDetail, /ariaLabel="Filtra il diario per autore"/);
  assert.match(patientDetail, /id="patient-tab-panel"[\s\S]*?role="tabpanel"/);
  assert.match(patientDetail, /aria-labelledby=\{patientPanelLabelledBy\}/);
});

test('top navigation follows the keyboard tab pattern with one focusable active tab', () => {
  assert.match(topNav, /className\?: string/);
  assert.match(topNav, /className \? ` \$\{className\}` : ''/);
  assert.match(topNav, /tabIndex=\{active \? 0 : -1\}/);
  assert.match(topNav, /event\.key === 'ArrowRight'/);
  assert.match(topNav, /event\.key === 'ArrowLeft'/);
  assert.match(topNav, /event\.key === 'Home'/);
  assert.match(topNav, /event\.key === 'End'/);
  assert.match(topNav, /aria-controls=\{panelId\}/);
  assert.match(topNavStyles, /\.top-nav__item:focus-visible\s*\{/);
  assert.match(
    topNavStyles,
    /\.top-nav--section-grid \.top-nav__items\s*\{[\s\S]*?display: grid[\s\S]*?repeat\(auto-fit, minmax\(128px, 1fr\)\)[\s\S]*?overflow: visible/,
  );
  assert.match(
    topNavStyles,
    /\.top-nav--section-grid \.top-nav__item\s*\{[\s\S]*?white-space: normal[\s\S]*?text-wrap: balance/,
  );
});

test('therapy sections reuse the canonical contextual navigation', () => {
  assert.match(therapyTab, /<TopNav[\s\S]*?variant="level3"/);
  assert.match(therapyTab, /ariaLabel="Sezioni della terapia farmacologica"/);
  assert.match(therapyTab, /activeKey=\{subTab\}/);
  assert.doesNotMatch(therapyTab, /className=\{`tf-subtab/);
  assert.match(appStyles, /\.tf-subtabs \.top-nav--level3\s*\{[\s\S]*?background: #fff/);
  assert.match(appStyles, /@media \(max-width: 768px\)[\s\S]*?\.tf-subtabs \.top-nav--level3/);
});

test('overview removes duplicated KPI tiles and uses semantic operational sections', () => {
  assert.doesNotMatch(patientDetail, /className="cr-quick-stats"/);
  assert.match(patientDetail, />Stato clinico</);
  assert.match(patientDetail, />Operatività e degenza</);
  assert.match(patientDetail, /<article className="cr-riepilogo-card/);
  assert.match(patientDetail, /className="cr-overview-action"/);
  assert.doesNotMatch(
    patientDetail,
    /<button[\s\S]{0,160}className="cr-riepilogo-card cr-riepilogo-card--nav"/,
  );
});

test('overview is three columns on wide screens, two on tablet and one on phone', () => {
  assert.match(
    appStyles,
    /\.cr-tab-content--overview \.cr-riepilogo-grid\s*\{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/,
  );
  assert.match(appStyles, /@media \(min-width: 1200px\)[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(
    appStyles,
    /@media \(max-width: 640px\)[\s\S]*?\.cr-tab-content--overview \.cr-riepilogo-grid\s*\{[\s\S]*?minmax\(0, 1fr\)/,
  );
  assert.match(
    topNavStyles,
    /\.top-nav--level3 \.top-nav__item\.is-active::after\s*\{[\s\S]*?background: #2f6bed/,
  );
});

test('patient record applies one screen-only contract to cards, key-value rows and tables', () => {
  assert.match(patientDetail, /import '\.\/PatientRecordData\.css'/);
  assert.match(dataStyles, /@media screen/);
  assert.match(dataStyles, /--patient-data-row-height: 46px/);
  assert.match(
    dataStyles,
    /:is\(\.clinical-card, \.cts, \.cr-profilo-group, \.narrative-section\)/,
  );
  assert.match(dataStyles, /\.patient-record-view \.pic-row\s*\{[\s\S]*?grid-template-columns/);
  for (const tableClass of [
    'clinicos-table',
    'parametri-modulo-table',
    'braden-modulo-table',
    'med-modulo-table',
    'med-followup-table',
  ]) {
    assert.match(dataStyles, new RegExp(`\\.${tableClass}`));
  }
});

test('patient record data contract keeps tablet overflow local and stacks key-value rows on phones', () => {
  assert.match(dataStyles, /\.clinicos-table-wrap\s*\{[\s\S]*?overflow-x: auto/);
  assert.match(dataStyles, /:is\(\.fm, \.modulo-content\)\s*\{[\s\S]*?overflow-x: auto/);
  assert.match(
    dataStyles,
    /:is\([\s\S]*?\.top-nav__items,[\s\S]*?\.clinicos-table-wrap,[\s\S]*?\.parametri-grid-wrapper,[\s\S]*?scrollbar-width: none/,
  );
  assert.match(dataStyles, /::-webkit-scrollbar\s*\{[\s\S]*?display: none[\s\S]*?height: 0/);
  assert.match(
    dataStyles,
    /@media \(max-width: 768px\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/,
  );
  assert.match(dataStyles, /:focus-visible/);
});
