import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  EMPTY_OPERATOR_FORM,
  operatorProfileUpdate,
} from '../../components/admin/operatorFormModel';
import type { RuoloOperatore } from '../../types';
import {
  isStandardOperatorRole,
  operatorProfileLabel,
  operatorRolePresentation,
} from '../operatorRolePresentation';

for (const [value, expected] of [
  ['medico', 'Medico'],
  ['infermiere', 'Infermiere'],
  ['coordinatore', 'Coordinatore'],
  ['oss', 'OSS (legacy)'],
  ['fisioterapista', 'Fisioterapista (legacy)'],
  ['operatore', 'Operatore (legacy)'],
  ['altro', 'Altro (legacy)'],
  ['admin', 'Amministratore (legacy)'],
  ['manager', 'Manager (legacy)'],
  ['  InFeRmIeRe  ', 'Infermiere'],
] as const) {
  test(`428 explicit professional label ${value}`, () => {
    assert.equal(operatorRolePresentation(value).label, expected);
    assert.equal(operatorRolePresentation(value).needsVerification, false);
  });
}

for (const value of [null, undefined, '', '   ', {}, 42]) {
  test(`428 missing value ${JSON.stringify(value)}`, () => {
    assert.deepEqual(operatorRolePresentation(value), {
      label: 'Ruolo non disponibile',
      needsVerification: true,
    });
  });
}

test('428 unknown tokens stay explicit, never inferred as a permission or doctor', () => {
  for (const value of [
    'nuova-funzione',
    '__proto__',
    'constructor',
    '<img src=x onerror=alert(1)>',
  ]) {
    assert.deepEqual(operatorRolePresentation(value), {
      label: `${value} (da verificare)`,
      needsVerification: true,
    });
  }
});

test('428 qualification is distinct and formatting never mutates original data', () => {
  const source = Object.freeze({ ruolo: '  OSS ', qualifica: ' assistenza sintetica ' });
  assert.equal(operatorProfileLabel(source), 'OSS (legacy) · Qualifica: assistenza sintetica');
  assert.equal(source.ruolo, '  OSS ');
  assert.equal(source.qualifica, ' assistenza sintetica ');
  assert.equal(operatorProfileLabel({ ruolo: null }), 'Ruolo non disponibile');
});

test('428 only exact existing standard values are standard editor options', () => {
  for (const value of ['medico', 'infermiere', 'coordinatore'])
    assert.equal(isStandardOperatorRole(value), true);
  for (const value of [null, '', 'oss', ' Medico ', 'admin', 'constructor'])
    assert.equal(isStandardOperatorRole(value), false);
});

test('428 all profile surfaces use the shared label and preserve unchanged role', () => {
  for (const path of [
    '../../components/admin/OperatorManagement.tsx',
    '../../components/admin/OperatorWorkloadHeading.tsx',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /operatorProfileLabel\(op\)/);
  }
  const model = readFileSync(
    new URL('../../components/admin/operatorFormModel.ts', import.meta.url),
    'utf8',
  );
  assert.match(model, /value\.ruolo === original\.ruolo/);
  assert.match(model, /delete updates\.ruolo/);
  const panel = readFileSync(
    new URL('../../components/admin/OperatorFormPanel.tsx', import.meta.url),
    'utf8',
  );
  assert.match(panel, /!isStandardOperatorRole\(value\.ruolo\)/);
  assert.match(panel, /<option value=\{value\.ruolo\}>/);
});

test('428 unrelated edits omit the exact original role; only an explicit change sends it', () => {
  for (const raw of ['', '  OSS ', 'oss', 'constructor', 'medico']) {
    const ruolo = raw as RuoloOperatore;
    const form = Object.freeze({ ...EMPTY_OPERATOR_FORM, ruolo, reparto: 'Reparto sintetico' });
    const original = Object.freeze({ ruolo });
    const updates = operatorProfileUpdate(form, original);
    assert.equal(Object.hasOwn(updates, 'ruolo'), false);
    assert.equal(updates.reparto, form.reparto);
    assert.equal(form.ruolo, raw);
    assert.equal(
      operatorProfileUpdate({ ...form, ruolo: 'infermiere' }, original).ruolo,
      'infermiere',
    );
    assert.equal(Object.hasOwn(updates, 'role'), false);
  }
});
