import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { TherapyGiroRows } from '../TherapyGiroRows';
import { ConfirmDialog } from '../../shared/ConfirmDialog';

Object.assign(globalThis, { React, requestAnimationFrame: (fn: () => void) => { fn(); return 1; } });

const patient = (patientId: string, patch: Record<string, unknown> = {}) => ({
  patientId,
  firstName: 'Synthetic',
  lastName: patientId,
  dateOfBirth: null,
  codiceFiscale: null,
  location: null,
  room: '',
  bed: '',
  temporaryPsExit: null,
  administrations: [{
    administrationId: null,
    therapyId: `therapy-${patientId}`,
    drugName: 'Synthetic medication',
    dosage: '1 unit',
    route: 'oral',
    scheduledTime: '08:00',
    status: 'pending',
    administeredAt: null,
    administeredBy: null,
    notAdministeredReason: null,
  }],
  ...patch,
});

const giro = (...patients: ReturnType<typeof patient>[]) => ({
  ora: '08:00',
  patients: patients.map((p) => ({
    patient: p,
    items: p.administrations.map((a) => ({ a, fascia: 'mattina' as const })),
  })),
  total: patients.length,
  administered: 0,
  notAdministered: 0,
  pending: patients.length,
});

function elements(root: any): any[] {
  if (Array.isArray(root)) return root.flatMap(elements);
  if (!root || typeof root !== 'object' || !root.props) return [];
  return [root, ...elements(root.props.children)];
}

// This controlled-hook dispatcher runs TherapyGiroRows itself and its callback props.
// It does not emulate React DOM, browser events, HTTP, or clinical writes.
function controlledRender() {
  const slots: any[] = [];
  let cursor = 0;
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const dispatch = {
    useState(initial: any) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], (value: any) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial: any) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i];
    },
    useEffect() { cursor++; },
  };
  return (props: any) => {
    cursor = 0;
    const old = internals.H;
    internals.H = dispatch;
    try { return TherapyGiroRows(props); }
    finally { internals.H = old; }
  };
}

const props = (time: ReturnType<typeof giro>, extra: Record<string, unknown> = {}, date = '2026-10-21') => ({
  time,
  date,
  filtro: 'tutte',
  ...extra,
});

test('an open refusal preserves its reason and note but a stale confirmation cannot write after PS verification changes', () => {
  const render = controlledRender();
  let writes = 0;
  const extra = { onNotAdministered: () => { writes++; } };
  let tree = render(props(giro(patient('patient-a')), extra));
  elements(tree).find((e) => e.type === 'button' && String(e.props['aria-label']).startsWith('Non erogata:'))!.props.onClick();
  tree = render(props(giro(patient('patient-a')), extra));
  elements(tree).find((e) => e.type === 'button' && String(e.props['aria-label']).startsWith('Altro:'))!.props.onClick();
  tree = render(props(giro(patient('patient-a')), extra));
  elements(tree).find((e) => e.type === 'input' && e.props.className === 'form-input giro-note')!.props.onChange({ target: { value: 'nota sintetica' } });
  tree = render(props(giro(patient('patient-a')), extra));
  const staleConfirm = elements(tree).find((e) => e.type === 'button' && String(e.props['aria-label']).startsWith('Conferma non erogata:'))!.props.onClick;

  tree = render(props(giro(patient('patient-a', { temporaryPsExitUnverified: true })), extra));
  const currentConfirm = elements(tree).find((e) => e.type === 'button' && String(e.props['aria-label']).startsWith('Conferma non erogata:'));
  const note = elements(tree).find((e) => e.type === 'input' && e.props.className === 'form-input giro-note');
  assert.ok(currentConfirm?.props.disabled);
  assert.equal(note?.props.value, 'nota sintetica');
  assert.ok(elements(tree).some((e) => e.props.role === 'status' && String(e.props.children).includes('non disponibile')));
  staleConfirm();
  assert.equal(writes, 0);
});

test('an open supervisor confirmation is disabled after patient removal and its stale handler stays guarded', () => {
  const render = controlledRender();
  let writes = 0;
  const extra = { requiresConfirmation: true, onConfirm: () => { writes++; } };
  let tree = render(props(giro(patient('patient-a')), extra));
  elements(tree).find((e) => e.type === 'button' && String(e.props['aria-label']).startsWith('Erogata:'))!.props.onClick();
  tree = render(props(giro(patient('patient-a')), extra));
  const staleConfirm = elements(tree).find((e) => e.type === ConfirmDialog && e.props.open)!.props.onConfirm;

  tree = render(props(giro(patient('patient-a', { temporaryPsExitUnverified: true })), extra));
  const unverifiedDialog = elements(tree).find((e) => e.type === ConfirmDialog && e.props.open);
  assert.ok(unverifiedDialog?.props.confirmDisabled);
  assert.match(String(unverifiedDialog?.props.message), /Stato uscita PS da verificare/);
  staleConfirm();
  assert.equal(writes, 0);

  tree = render(props(giro(), extra));
  const dialog = elements(tree).find((e) => e.type === ConfirmDialog && e.props.open);
  assert.ok(dialog?.props.confirmDisabled);
  assert.match(String(dialog?.props.message), /paziente non più disponibile/);
  staleConfirm();
  assert.equal(writes, 0);
});

test('a supervisor confirmation cannot cross into a different date context', () => {
  const render = controlledRender();
  let writes = 0;
  const extra = { requiresConfirmation: true, onConfirm: () => { writes++; } };
  let tree = render(props(giro(patient('patient-a')), extra));
  elements(tree).find((e) => e.type === 'button' && String(e.props['aria-label']).startsWith('Erogata:'))!.props.onClick();
  tree = render(props(giro(patient('patient-a')), extra));
  const staleConfirm = elements(tree).find((e) => e.type === ConfirmDialog && e.props.open)!.props.onConfirm;

  tree = render(props(giro(patient('patient-a')), extra, '2026-10-22'));
  const dialog = elements(tree).find((e) => e.type === ConfirmDialog && e.props.open);
  assert.ok(dialog?.props.confirmDisabled);
  assert.match(String(dialog?.props.message), /conferma non disponibile/);
  staleConfirm();
  assert.equal(writes, 0);
});

test('unverified patient is blocked while a verified peer remains actionable', () => {
  const render = controlledRender();
  const delivered: string[] = [];
  const extra = { onConfirm: (info: { patientId: string }) => { delivered.push(info.patientId); } };
  const tree = render(props(giro(
    patient('patient-unverified', { temporaryPsExitUnverified: true }),
    patient('patient-valid'),
  ), extra));
  const action = elements(tree).find((e) => e.type === 'button' && String(e.props['aria-label']).startsWith('Erogata:'));
  assert.ok(action);
  action.props.onClick();
  assert.deepEqual(delivered, ['patient-valid']);
});

test('verified PS pause keeps the existing explicit Non somm. acknowledgement available', () => {
  const render = controlledRender();
  const refusals: string[] = [];
  const extra = { onNotAdministered: (info: { patientId: string }) => { refusals.push(info.patientId); } };
  let tree = render(props(giro(patient('patient-paused', { temporaryPsExit: { decision: 'pause' } })), extra));
  elements(tree).find((e) => e.type === 'button' && String(e.props['aria-label']).startsWith('Non erogata:'))!.props.onClick();
  tree = render(props(giro(patient('patient-paused', { temporaryPsExit: { decision: 'pause' } })), extra));
  elements(tree).find((e) => e.type === 'button' && 'aria-pressed' in e.props)!.props.onClick();
  tree = render(props(giro(patient('patient-paused', { temporaryPsExit: { decision: 'pause' } })), extra));
  elements(tree).find((e) => e.type === 'button' && String(e.props['aria-label']).startsWith('Conferma non erogata:'))!.props.onClick();
  assert.deepEqual(refusals, ['patient-paused']);
});
