import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const designSystem = read('../../design-system.css');
const appCss = read('../../App.css');
const additions = read('../../app-additions.css');
const patientList = read('../../components/operator/PatientList.css');
const schedule = read('../../components/admin/OperatorSchedule.tsx');

/** Corpo della prima regola il cui selettore è esattamente `selector`. */
function rule(css: string, selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.ok(start >= 0, `regola ${selector} non trovata`);
  return css.slice(start, css.indexOf('}', start));
}

test('un solo insieme di toni di stato su :root, usato anche da ds-badge', () => {
  for (const token of [
    '--ds-tone-ok:',
    '--ds-tone-ok-solid:',
    '--ds-tone-warning:',
    '--ds-tone-alarm:',
    '--ds-tone-neutral-solid:',
  ]) {
    assert.ok(designSystem.includes(token), token);
  }
  // il verde resta il token storico condiviso con stato-pill (successBadgeContrast.test.ts)
  assert.match(designSystem, /--ds-tone-ok: var\(--badge-success-text/);
  assert.match(rule(designSystem, '.ds-badge--ok:not(#ds)'), /color: var\(--badge-success-text/);
  assert.match(
    rule(designSystem, '.ds-badge--warning:not(#ds)'),
    /color: var\(--ds-tone-warning\)/,
  );
  assert.match(rule(designSystem, '.ds-badge--alarm:not(#ds)'), /color: var\(--ds-tone-alarm\)/);
});

test('i badge storici leggono i toni nel loro CSS, senza blocco di correzioni sopra', () => {
  assert.doesNotMatch(designSystem, /Contrasto delle etichette piccole/);
  const legacy: Array<[string, string, RegExp]> = [
    [additions, '.agt-badge--programmato', /background: var\(--ds-tone-warning\)/],
    [additions, '.agt-badge--in_corso', /background: var\(--ds-blue-active\)/],
    [additions, '.agt-badge--completato', /background: var\(--ds-tone-ok-solid\)/],
    [additions, '.agt-badge--annullato', /background: var\(--ds-tone-neutral-solid\)/],
    [additions, '.letto-stato--libero', /color: var\(--ds-tone-ok\)/],
    [additions, '.letto-stato--occupato', /color: var\(--ds-tone-alarm\)/],
    [additions, '.letto-stato--manutenzione', /color: var\(--ds-tone-warning\)/],
    [additions, '.cts__badge', /color: var\(--ds-blue-active\)/],
    [additions, '.room-number-badge', /color: var\(--ds-blue-active\)/],
    [appCss, '.alert-chip--red', /color: var\(--ds-tone-alarm\)/],
    [appCss, '.alert-chip--amber', /color: var\(--ds-tone-warning\)/],
    [appCss, '.badge--green', /background: var\(--ds-tone-ok-solid\)/],
    [appCss, '.badge--amber', /background: var\(--ds-tone-warning\)/],
    [appCss, '.op-avatar-sm', /color: var\(--ds-blue-active\)/],
    [appCss, '.assistant-id__badge', /color: var\(--ds-blue-active\)/],
    [patientList, '.patient-roster-status', /color: var\(--ds-blue-active\)/],
  ];
  for (const [css, selector, expected] of legacy) {
    const body = rule(css, selector);
    assert.match(body, expected, selector);
    // solo il bianco del testo sui fondi pieni resta letterale
    assert.doesNotMatch(
      body.replace(/#fff(fff)?\b/gi, ''),
      /#[0-9a-f]{3,6}\b/i,
      `${selector} senza esadecimali`,
    );
  }
});

test('menu degli orari all’altezza canonica, fallback di caricamento senza lampo', () => {
  assert.doesNotMatch(schedule, /height: 32/);
  assert.match(schedule, /schedule-day__times--edit/);
  assert.match(rule(additions, '.schedule-day--off'), /opacity: 0\.75/);
  assert.match(
    rule(appCss, '.page-loading'),
    /animation: page-loading-reveal 0\.15s ease-out 0\.4s backwards/,
  );
});
