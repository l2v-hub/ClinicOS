import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TAB_GROUPS,
  resolvePatientTab,
  patientTabGroup,
} from '../../components/operator/tabGroups';
import {
  navigationScope,
  navigateAgnosTarget,
  writeActionNavigation,
} from '../../components/shared/agnos/agnosActionNavigation';
import { navTabId } from '../../components/shared/agnos/agnosNav';

test('chart groups organize intake and clinical work while legacy links keep their destination', () => {
  assert.deepEqual(
    TAB_GROUPS[0].tabs.map((tab) => tab.id),
    ['profilo', 'contatti', 'presa-in-carico'],
  );
  assert.deepEqual(
    TAB_GROUPS[1].tabs.map((tab) => tab.id),
    ['diagnosi', 'terapia-farmacologica', 'consegne', 'parametri', 'esami-consulenze', 'note'],
  );
  assert.equal(resolvePatientTab(), 'profilo');
  assert.equal(resolvePatientTab('riepilogo'), 'profilo');
  assert.equal(resolvePatientTab('sezioni-narrative'), 'diagnosi');
  assert.equal(patientTabGroup('sezioni-narrative'), 'clinica');
  assert.equal(patientTabGroup('presa-in-carico'), 'panoramica');
  assert.equal(patientTabGroup('consegne'), 'clinica');
});

test('discharge opens directly beside Documents and legacy links keep the same module', () => {
  const documentIndex = TAB_GROUPS.findIndex((group) => group.id === 'documenti');
  assert.equal(TAB_GROUPS[documentIndex + 1].id, 'dimissione');
  assert.equal(patientTabGroup('dimissione'), 'dimissione');
  assert.equal(resolvePatientTab('dimissione'), 'dimissione');
  assert.equal(TAB_GROUPS.flatMap((group) => group.tabs).filter((tab) => tab.id === 'dimissione').length, 1);
  assert.ok(!TAB_GROUPS.find((group) => group.id === 'moduli')!.tabs.some((tab) => tab.id === 'dimissione'));
});

test('Agnos opens the separate therapy page for both roles without confusing the agenda', async () => {
  for (const isAdmin of [false, true]) {
    const calls: string[] = [];
    const handlers = {
      isAdmin,
      navigate: (key: string) => {
        calls.push(key);
      },
      openPatient: async () => false,
      openConsegne() {},
    };
    const nav = {
      type: 'open_therapies_today',
      label: 'Terapie',
      patientId: 'ignored-patient-context',
    };
    assert.equal(navigationScope(nav, isAdmin ? 'admin' : 'operatore').navKey, 'terapie');
    assert.equal(navigationScope(nav).currentPatientId, undefined);
    assert.equal(await navigateAgnosTarget(nav, handlers), true);
    assert.equal(
      await navigateAgnosTarget({ type: 'open_agenda', label: 'Agenda' }, handlers),
      true,
    );
    assert.deepEqual(calls, ['terapie', isAdmin ? 'agenda-admin' : 'agenda-operatore']);
  }
});

test('demographic write preview opens the page that displays the field being changed', () => {
  for (const field of ['phone', 'email', 'address', 'codiceFiscale', 'firstName']) {
    const nav = writeActionNavigation({
      actionType: 'update_patient_demographics',
      patientId: 'qa-alpha',
      fields: { field },
    });
    assert.ok(nav);
    assert.equal(
      navTabId(nav),
      ['phone', 'email', 'address'].includes(field) ? 'contatti' : 'profilo',
    );
    assert.equal(nav.patientId, 'qa-alpha');
  }
});
