import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const operatorDashboard = readFileSync(
  new URL('../../components/operator/OperatorDashboard.tsx', import.meta.url),
  'utf8',
);
const adminDashboard = readFileSync(
  new URL('../../components/admin/AdminDashboard.tsx', import.meta.url),
  'utf8',
);
const patientList = readFileSync(
  new URL('../../components/operator/PatientList.tsx', import.meta.url),
  'utf8',
);
const patientDetail = readFileSync(
  new URL('../../components/operator/PatientDetail.tsx', import.meta.url),
  'utf8',
);

test('login loads only handover overview while the bounded feed is navigation-scoped', () => {
  assert.match(app, /navKey !== 'consegne'/);
  assert.match(app, /consegne\/overview/);
  assert.doesNotMatch(
    app,
    /fetch\(`\$\{API_URL\}\/consegne`,\s*\{\s*headers:\s*operatorHeaders\(\)/,
  );
  assert.match(app, /buildConsegnaFeedUrl\(API_URL, requestedQuery, cursor\)/);
});

test('dashboards consume exact overview and never derive KPI from a feed page', () => {
  assert.match(operatorDashboard, /consegneOverview\?\.summary/);
  assert.match(adminDashboard, /consegneOverview\?\.summary/);
  assert.doesNotMatch(operatorDashboard, /consegne\.filter/);
  assert.doesNotMatch(adminDashboard, /consegne\.filter/);
  assert.match(app, /consegneOverviewAbortRef\.current\?\.abort\(\)/);
  assert.match(app, /request === consegneOverviewRequestRef\.current/);
  assert.match(operatorDashboard, /consegneOverviewState === 'error'/);
  assert.match(adminDashboard, /consegneOverviewState === 'error'/);
});

test('patient list badges come from visible-id clinical summaries, not a handover roster prop', () => {
  assert.doesNotMatch(patientList, /consegne:\s*Consegna\[\]/);
  assert.match(patientList, /entry\.consegneAperte/);
});

test('patient detail distinguishes an exact total from the loaded page and exposes recovery', () => {
  assert.match(patientDetail, /consegneSummary\?\.open/);
  assert.match(patientDetail, /Mostrate \{mieConsegne\.length\} di \{consegneSummary\.total\}/);
  assert.match(patientDetail, /onLoadMoreConsegne/);
  assert.match(patientDetail, /onRetryConsegne/);
  assert.match(app, /mergeConsegnaPage\(current, page\.items, append\)/);
});
