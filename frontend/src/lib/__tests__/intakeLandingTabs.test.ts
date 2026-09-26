// Ogni modulo offerto nel passaggio "Moduli" del wizard deve aprire il proprio tab.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLINICAL_MODULES } from '../assessments/assessmentCatalog';
import { INTAKE_LANDING_TABS, intakeLandingTab } from '../intakeLandingTabs';
import { patientTabGroup } from '../../components/operator/tabGroups';

test('every module offered by the wizard is a landing tab', () => {
  for (const module of CLINICAL_MODULES) {
    assert.equal(intakeLandingTab(module.tab), module.tab, `${module.label} must open its tab`);
  }
  assert.equal(intakeLandingTab('painad'), 'painad');
  assert.equal(intakeLandingTab('postural_transfers'), 'postural_transfers');
});

test('landing tabs live in the Moduli or Dimissione groups', () => {
  for (const tab of INTAKE_LANDING_TABS) {
    assert.ok(
      ['moduli', 'dimissione'].includes(patientTabGroup(tab)),
      `${tab} → ${patientTabGroup(tab)}`,
    );
  }
});

test('unknown or missing tabs are not accepted', () => {
  assert.equal(intakeLandingTab(undefined), undefined);
  assert.equal(intakeLandingTab('profilo'), undefined);
  assert.equal(intakeLandingTab('inesistente'), undefined);
});

test('App.tsx uses the derived list instead of its own (source contract)', () => {
  const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
  assert.match(app, /intakeLandingTab\(/);
  assert.doesNotMatch(app, /const MODULE_TAB_IDS/);
});
