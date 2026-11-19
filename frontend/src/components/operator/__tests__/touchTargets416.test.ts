import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file: string) => readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8');
test('416 uses one bedside control height on every screen page, not a blanket WCAG failure', () => {
  const css = read('design-system.css');
  // Una sola misura: nessuna pagina la ridefinisce (né per puntatore, né per pagina).
  assert.deepEqual(css.match(/--ds-control-h: \d+px/g), [
    '--ds-control-h: 44px',
    '--ds-control-h: 48px',
  ]);
  assert.match(css, /@media print[\s\S]*?--ds-control-h: 48px/);
  assert.match(css, /bedside design goal[\s\S]*?not[\s\S]*?WCAG/i);
});
test('416 keeps shared icon controls from shrinking and search targets separate', () => {
  const css = read('design-system.css');
  assert.match(css, /:is\(\.ds-icon-btn, \.icon-btn\):not\(#ds\)[\s\S]*?flex-shrink: 0/);
  assert.match(css, /\.patient-list-view \.search-clear-btn:not\(#ds\)[\s\S]*?position: static/);
  assert.match(
    read('components/operator/PatientList.tsx'),
    /className="ds-icon-btn search-clear-btn"/,
  );
  assert.match(
    read('components/operator/PatientList.css'),
    /td\.patient-roster__actions > button \+ button\s*\{\s*margin-inline-start: 8px/,
  );
});
test('416 main chart and assessment actions have visible text, unchanged handlers', () => {
  const workspace = read('components/operator/assessments/AssessmentWorkspace.tsx');
  assert.doesNotMatch(workspace, /assessment-catalog-icon/);
  assert.match(workspace, /onClick=\{\(\) => create\(\)\}\s*>[\s\S]*?Nuova compilazione/);
  const chart = read('components/operator/PatientDetail.tsx');
  assert.doesNotMatch(chart, /ds-btn--collapsible/);
  assert.match(chart, /onClick=\{\(\) => setShowPrintDialog\(true\)\}/);
  assert.match(chart, /onClick=\{\(\) => setShowInvioPS\(true\)\}/);
});
test('416 mobile controls clear the actual wrapping header without changing navigation', () => {
  const hook = read('lib/useBedsideTouchLayout.ts');
  assert.match(hook, /new ResizeObserver\(measure\)/);
  assert.match(hook, /header.getBoundingClientRect\(\).height/);
  assert.match(hook, /observer.disconnect\(\)/);
  assert.doesNotMatch(hook, /fetch\(|setNavKey|setSessionCapabilities/);
  assert.match(
    read('compact-layout.css'),
    /scroll-margin-block-start: calc\(var\(--ds-topbar-occlusion/,
  );
});
