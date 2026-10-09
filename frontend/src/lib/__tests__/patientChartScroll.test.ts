import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const url = new URL('../../components/operator/PatientChartScroll.css', import.meta.url);
const css = existsSync(url) ? readFileSync(url, 'utf8') : '';
const component = readFileSync(new URL('../../components/operator/PatientDetail.tsx', import.meta.url), 'utf8');

test('the actual patient chart loads its scoped screen-only scroll contract', () => {
  assert.match(component, /import '\.\/PatientChartScroll\.css'/);
  assert.match(css, /@media screen/);
  assert.doesNotMatch(css, /!important/);
});
test('chart tabs do not become another vertical owner through cross-axis conversion', () => {
  assert.match(css, /\.cr-tab-content\s*\{[^}]*overflow-x:\s*clip;[^}]*overflow-y:\s*visible;/s);
  assert.match(css, /\.cr-detail-content\s*\{[^}]*overflow-y:\s*auto;/s);
});
test('small chart viewports explicitly release both axes and the constrained ancestor chain', () => {
  assert.match(css, /@media screen and \(max-width: 1023px\)/);
  assert.match(css, /html:has\(\.patient-record-view\)\s*\{[^}]*scroll-padding-block:\s*160px 12px;/s);
  assert.match(css, /\.page-content:has\(\.patient-record-view\)[^}]*height:\s*auto;[^}]*overflow:\s*visible;/s);
  assert.match(css, /\.patient-record-view[^}]*\.cr-detail-content\s*\{[^}]*height:\s*auto;[^}]*overflow:\s*visible;/s);
});
test('patient prescribing actions remain in flow rather than covering keyboard focus', () => {
  assert.match(css, /\.therapy-form-shell__actions\s*\{[^}]*position:\s*static;/s);
  assert.match(css, /scroll-margin-block:\s*12px;/);
  assert.doesNotMatch(css, /\.therapy-calendar-grid\s*\{/);
});

test('chart transitions do not create a clipped containing block for fixed therapy dialogs', () => {
  assert.match(css, /\.patient-record-view \.cr-detail-content\.tab-panel-transition\s*\{[^}]*animation:\s*none;/s);
});
