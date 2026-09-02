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

test('patient record exposes a labelled two-level navigation and controlled tab panel', () => {
  assert.match(patientDetail, /ariaLabel="Aree della cartella paziente"/);
  assert.match(patientDetail, /visualLabel="Aree cartella"/);
  assert.match(patientDetail, /visualLabel=\{`\$\{grp\.label\} · contenuti`\}/);
  assert.match(patientDetail, /ariaLabel="Filtra il diario per autore"/);
  assert.match(patientDetail, /id="patient-tab-panel"[\s\S]*?role="tabpanel"/);
  assert.match(patientDetail, /aria-labelledby=\{patientPanelLabelledBy\}/);
});

test('top navigation follows the keyboard tab pattern with one focusable active tab', () => {
  assert.match(topNav, /tabIndex=\{active \? 0 : -1\}/);
  assert.match(topNav, /event\.key === 'ArrowRight'/);
  assert.match(topNav, /event\.key === 'ArrowLeft'/);
  assert.match(topNav, /event\.key === 'Home'/);
  assert.match(topNav, /event\.key === 'End'/);
  assert.match(topNav, /aria-controls=\{panelId\}/);
  assert.match(topNavStyles, /\.top-nav__item:focus-visible\s*\{/);
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
