// Milo fase 3: cruscotti fissati nel browser — solo la domanda e l'id del paziente, per operatore.
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
const pins = await import('./miloPins');

beforeEach(() => store.clear());

test('only the question and the patient id are stored, per operator', () => {
  pins.addMiloPin('op1', '  NEWS2 di oggi  ', 'p1');
  const raw = JSON.parse(store.get('clinicos.milo.pins.op1') ?? '[]');
  assert.equal(raw.length, 1);
  assert.deepEqual(Object.keys(raw[0]).sort(), ['createdAt', 'id', 'patientId', 'question']);
  assert.equal(raw[0].question, 'NEWS2 di oggi');
  assert.equal(pins.loadMiloPins('op2', 'p1').length, 0);
});

test('patient pins show only with that patient open; facility pins always; no duplicates', () => {
  pins.addMiloPin('op1', 'NEWS2 di oggi', 'p1');
  pins.addMiloPin('op1', 'turni di domani');
  pins.addMiloPin('op1', 'news2 di oggi', 'p1'); // duplicato
  assert.deepEqual(
    pins.loadMiloPins('op1', 'p1').map((p) => p.question),
    ['turni di domani', 'NEWS2 di oggi'],
  );
  assert.deepEqual(
    pins.loadMiloPins('op1', 'p2').map((p) => p.question),
    ['turni di domani'],
  );
  assert.equal(pins.isMiloPinned('op1', 'NEWS2 DI OGGI', 'p1'), true);
});

test('pins can be removed and survive a reload (read back from storage)', () => {
  const [pin] = pins.addMiloPin('op1', 'agenda della settimana');
  assert.equal(pins.loadMiloPins('op1').length, 1);
  pins.removeMiloPin('op1', pin.id);
  assert.equal(pins.loadMiloPins('op1').length, 0);
  store.set('clinicos.milo.pins.op1', 'non json');
  assert.deepEqual(pins.loadMiloPins('op1'), []);
});
